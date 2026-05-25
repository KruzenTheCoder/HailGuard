"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { MessageSquare, Search, Send, CheckCircle2, History, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { sendChatSupportMessage, setChatRoomStatus } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { createClient } from "@/lib/supabase/client";

export type ChatRoom = {
  id: string;
  driverId: string;
  driverName: string;
  driverEmail: string | null;
  driverPhone: string | null;
  status: "open" | "resolved";
  updatedAt: string;
  lastMessage?: string;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: string;
};

export function ChatsClient({ myUserId }: { myUserId: string }) {
  const supabase = createClient();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"open" | "resolved">("open");
  const [pending, startTransition] = useTransition();

  const activeRoomRef = useRef(activeRoom);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keep ref updated to avoid stale state in subscription callback
  useEffect(() => {
    activeRoomRef.current = activeRoom;
    if (activeRoom) {
      loadMessages(activeRoom);
    } else {
      setMessages([]);
    }
  }, [activeRoom]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadRooms() {
    const { data, error } = await supabase
      .from("chat_rooms")
      .select(`
        id,
        driver_id,
        status,
        updated_at,
        driver_profiles (
          id,
          users (
            full_name,
            email,
            phone_number
          )
        )
      `)
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Failed to load chat rooms: " + error.message);
      return;
    }

    const roomsMapped: ChatRoom[] = await Promise.all(
      (data ?? []).map(async (r: any) => {
        const dp = r.driver_profiles;
        const u = dp?.users;

        const { data: msgData } = await supabase
          .from("chat_messages")
          .select("message")
          .eq("room_id", r.id)
          .order("created_at", { ascending: false })
          .limit(1);

        return {
          id: r.id,
          driverId: dp?.id ?? "",
          driverName: u?.full_name || u?.email || u?.phone_number || "Unknown Driver",
          driverEmail: u?.email ?? null,
          driverPhone: u?.phone_number ?? null,
          status: r.status,
          updatedAt: r.updated_at,
          lastMessage: msgData?.[0]?.message ?? "No messages yet",
        };
      })
    );

    setRooms(roomsMapped);
  }

  async function loadMessages(roomId: string) {
    const { data, error } = await supabase
      .from("chat_messages")
      .select(`
        id,
        room_id,
        sender_id,
        message,
        created_at,
        users:sender_id (
          full_name,
          role
        )
      `)
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to load messages: " + error.message);
      return;
    }

    const msgsMapped: ChatMessage[] = (data ?? []).map((m: any) => ({
      id: m.id,
      roomId: m.room_id,
      senderId: m.sender_id,
      senderName: m.users?.full_name || "Support Agent",
      senderRole: m.users?.role || "staff",
      message: m.message,
      createdAt: m.created_at,
    }));

    setMessages(msgsMapped);
  }

  // Subscribe to real-time changes
  useEffect(() => {
    loadRooms();

    const channel = supabase
      .channel("support_chats_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const newMsg = payload.new;
          if (activeRoomRef.current && newMsg.room_id === activeRoomRef.current) {
            loadMessages(activeRoomRef.current);
          }
          loadRooms();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_rooms" },
        () => {
          loadRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || !activeRoom) return;

    const currentText = messageText.trim();
    setMessageText("");

    // Optimistically add the message to the current thread immediately
    const tempMsgId = Math.random().toString(36).substring(7);
    const tempMsg: ChatMessage = {
      id: tempMsgId,
      roomId: activeRoom,
      senderId: myUserId,
      senderName: "Support Agent",
      senderRole: "staff",
      message: currentText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMsg]);

    // Optimistically update the room in the sidebar queue so it shows the last message and bubbles to the top
    setRooms((prevRooms) =>
      prevRooms
        .map((r) =>
          r.id === activeRoom
            ? { ...r, lastMessage: currentText, updatedAt: new Date().toISOString() }
            : r
        )
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    );

    startTransition(async () => {
      try {
        const newMsg = await sendChatSupportMessage(activeRoom, currentText);
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMsgId ? newMsg : m))
        );
        // Silently reload the rooms list to keep counts and status fully synchronized
        loadRooms();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send message");
        setMessages((prev) => prev.filter((m) => m.id !== tempMsgId));
        setMessageText(currentText); // restore input
        loadRooms(); // restore original rooms
      }
    });
  }

  function handleToggleStatus(roomId: string, currentStatus: "open" | "resolved") {
    const nextStatus = currentStatus === "open" ? "resolved" : "open";
    startTransition(async () => {
      try {
        await setChatRoomStatus(roomId, nextStatus);
        toast.success(nextStatus === "resolved" ? "Chat marked as Resolved" : "Chat reopened");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update status");
      }
    });
  }

  const selectedRoom = rooms.find((r) => r.id === activeRoom);

  const filteredRooms = rooms
    .filter((r) => r.status === statusFilter)
    .filter((r) => r.driverName.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 p-8 overflow-hidden">
      {/* Channels Sidebar Pane */}
      <div className="flex w-80 shrink-0 flex-col gap-4 bg-card rounded-xl border border-border p-4">
        {/* Header Search & Filter */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search driver chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          {/* Status filter toggle tabs */}
          <div className="flex rounded-lg bg-muted p-1 text-xs">
            <button
              onClick={() => setStatusFilter("open")}
              className={`flex-1 rounded-md py-1 text-center font-medium transition-all ${
                statusFilter === "open" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Open Active
            </button>
            <button
              onClick={() => setStatusFilter("resolved")}
              className={`flex-1 rounded-md py-1 text-center font-medium transition-all ${
                statusFilter === "resolved" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Resolved
            </button>
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
          {filteredRooms.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No chats found.
            </div>
          ) : (
            filteredRooms.map((room) => {
              const isActive = room.id === activeRoom;
              return (
                <button
                  key={room.id}
                  onClick={() => setActiveRoom(room.id)}
                  className={`flex flex-col text-left gap-1.5 p-3 rounded-lg border text-sm transition-all ${
                    isActive
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-foreground truncate max-w-[150px]">
                      {room.driverName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(room.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs truncate w-full text-muted-foreground">
                    {room.lastMessage}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Conversation Workspace Pane */}
      <div className="flex-1 flex flex-col bg-card rounded-xl border border-border overflow-hidden">
        {selectedRoom ? (
          <>
            {/* Header info */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-foreground">{selectedRoom.driverName}</h2>
                  <StatusBadge status={selectedRoom.status} />
                </div>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {selectedRoom.driverEmail ? <span>{selectedRoom.driverEmail}</span> : null}
                  {selectedRoom.driverPhone ? <span>· {selectedRoom.driverPhone}</span> : null}
                  <Link
                    href={`/admin/drivers/${selectedRoom.driverId}`}
                    className="text-primary hover:underline font-medium ml-1 flex items-center gap-0.5"
                  >
                    View dossier
                  </Link>
                </div>
              </div>

              {/* Action buttons (Resolve / Reopen) */}
              <Button
                variant={selectedRoom.status === "open" ? "outline" : "default"}
                size="sm"
                className={selectedRoom.status === "open" ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
                onClick={() => handleToggleStatus(selectedRoom.id, selectedRoom.status)}
              >
                {selectedRoom.status === "open" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Mark as Resolved
                  </>
                ) : (
                  <>
                    <History className="h-4 w-4 mr-1.5" />
                    Reopen Chat
                  </>
                )}
              </Button>
            </div>

            {/* Message bubbles scrolling area */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/30 animate-pulse" />
                  <p className="text-sm">No messages in this chat yet.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === myUserId || msg.senderRole !== "driver";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[70%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1 px-1">
                        <span className="font-semibold text-foreground/80">{msg.senderName}</span>
                        {msg.senderRole !== "driver" ? <span className="bg-primary/10 text-primary px-1 rounded text-[8px] uppercase tracking-wide">staff</span> : null}
                        <span>· {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-muted text-foreground rounded-tl-none border border-border/40"
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input send message area */}
            <form onSubmit={handleSend} className="p-4 border-t border-border flex gap-2">
              <Input
                placeholder={selectedRoom.status === "resolved" ? "Reopen this chat to send a message..." : "Type your reply..."}
                disabled={selectedRoom.status === "resolved" || pending}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 h-10 rounded-lg pr-4"
              />
              <Button
                type="submit"
                disabled={selectedRoom.status === "resolved" || !messageText.trim() || pending}
                className="h-10 w-10 shrink-0 p-0 flex items-center justify-center bg-primary hover:bg-primary/90 text-white rounded-lg"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-foreground mt-1">Support Chats</h3>
            <p className="text-sm text-center max-w-sm px-4">
              Select a driver's active conversation from the sidebar queue to start assisting with compliance and zone pass issues in real time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
