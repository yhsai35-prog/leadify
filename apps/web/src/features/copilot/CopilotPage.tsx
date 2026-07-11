import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { CopilotMessage } from "@bluwheelz/shared";
import {
  Bot,
  Send,
  User,
  Sparkles,
  Loader2,
  Mail,
  Target,
  GitCompareArrows,
  Search,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useCopilotChat, useCopilotSuggestions } from "./useCopilot";

interface ChatEntry {
  role: "user" | "assistant";
  content: string;
}

function suggestionIcon(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("email") || lower.includes("draft") || lower.includes("outreach")) return Mail;
  if (lower.includes("similar")) return GitCompareArrows;
  if (lower.includes("priorit") || lower.includes("highest") || lower.includes("top")) return Target;
  if (lower.includes("analyze") || lower.includes("find") || lower.includes("show")) return Search;
  return Sparkles;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/25">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-border/60 bg-muted/50 px-4 py-3">
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export function CopilotPage() {
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const chat = useCopilotChat();
  const { data: suggestions } = useCopilotSuggestions();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chat.isPending]);

  const send = (message: string) => {
    if (!message.trim() || chat.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: message.trim() }]);
    setInput("");
    chat.mutate(message.trim(), {
      onSuccess: (response: CopilotMessage[]) => {
        for (const m of response) {
          if (m.notification) {
            toast({
              title: m.notification.title,
              description: m.notification.description,
              variant: m.notification.variant,
            });
          }
        }
        const visible = response.filter((m) => m.role === "assistant" && m.content.trim());
        if (visible.length > 0) {
          setMessages((prev) => [...prev, ...visible.map((m) => ({ role: m.role as "assistant", content: m.content }))]);
        }
      },
      onError: () => {
        toast({ title: "Copilot request failed", description: "Please try again in a moment.", variant: "error" });
      },
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-4">
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-card via-card to-primary/[0.06] px-5 py-4">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">AI Copilot</h1>
              <Badge variant="outline" className="border-primary/30 text-[10px] uppercase tracking-wide text-primary">
                Sales assistant
              </Badge>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Ask about your pipeline, draft outreach, and compare leads to existing clients. Copilot never sends email
              without your approval.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-primary" />
            Human approval required before send
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/50 shadow-sm">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
          {messages.length === 0 && !chat.isPending && (
            <div className="flex h-full flex-col items-center justify-center px-2 py-8 text-center">
              <div className="relative mb-5">
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/25">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-lg font-medium">How can I help with your pipeline today?</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Pick a starter prompt below or type your own question about leads, outreach, and client similarity.
              </p>
              <div className="mt-8 grid w-full max-w-3xl gap-2 sm:grid-cols-2">
                {suggestions?.map((s) => {
                  const Icon = suggestionIcon(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="group flex items-start gap-3 rounded-xl border border-border/70 bg-background/40 px-4 py-3 text-left text-sm transition-all hover:border-primary/35 hover:bg-primary/[0.05] hover:shadow-sm"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-muted-foreground transition-colors group-hover:bg-primary/15 group-hover:text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-foreground/90">{s}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
              <div
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1",
                  m.role === "user"
                    ? "bg-primary/15 ring-primary/25 text-primary"
                    : "bg-muted ring-border/60 text-muted-foreground",
                )}
              >
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div
                className={cn(
                  "max-w-[min(75%,42rem)] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                  m.role === "user"
                    ? "rounded-tr-md bg-primary text-primary-foreground"
                    : "rounded-tl-md border border-border/50 bg-muted/40",
                )}
              >
                {m.content}
              </div>
            </div>
          ))}

          {chat.isPending && <TypingIndicator />}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-border/70 bg-background/40 p-3 md:p-4">
          <div className="flex items-end gap-2 rounded-xl border border-border/70 bg-background p-2 shadow-sm focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your pipeline… (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="min-h-[44px] max-h-32 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              disabled={chat.isPending}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-lg"
              disabled={chat.isPending || !input.trim()}
            >
              {chat.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
