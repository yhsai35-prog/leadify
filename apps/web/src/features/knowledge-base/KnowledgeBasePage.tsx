import { useMemo, useState } from "react";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import type { KnowledgeBaseArticle } from "@bluwheelz/shared";
import { ROLE_RANK, UserRole } from "@bluwheelz/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import {
  useKnowledgeBaseArticles,
  useCreateArticle,
  useUpdateArticle,
  usePublishUpdate,
  useDeleteArticle,
} from "./useKnowledgeBase";

// ─── Article Form ────────────────────────────────────────────────────────────

interface ArticleFormProps {
  initial?: Partial<KnowledgeBaseArticle>;
  onSubmit: (data: { title: string; content: string; category: string }) => void;
  onCancel: () => void;
  isPending: boolean;
}

function ArticleForm({ initial, onSubmit, onCancel, isPending }: ArticleFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [category, setCategory] = useState(initial?.category ?? "General");

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm">
      <h3 className="text-base font-semibold">{initial?.id ? "Edit Article" : "New Article"}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="kb-title">Title</Label>
          <Input
            id="kb-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. About your company"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kb-category">Category</Label>
          <Input
            id="kb-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Company Overview"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="kb-content">Content</Label>
        <textarea
          id="kb-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter article content..."
          rows={10}
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={isPending || !title.trim() || !content.trim()}
          onClick={() => onSubmit({ title: title.trim(), content: content.trim(), category: category.trim() || "General" })}
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

// ─── Article Card ─────────────────────────────────────────────────────────────

function ArticleCard({
  article,
  isAdmin,
}: {
  article: KnowledgeBaseArticle;
  isAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const updateMutation = useUpdateArticle(article.id);
  const publishMutation = usePublishUpdate(article.id);
  const deleteMutation = useDeleteArticle();
  const { toast } = useToast();

  function handleUpdate(data: { title: string; content: string; category: string }) {
    updateMutation.mutate(data, {
      onSuccess: () => {
        toast({ title: "Article updated", variant: "success" });
        setEditing(false);
      },
      onError: (err) => toast({ title: "Update failed", description: err.message, variant: "error" }),
    });
  }

  function handlePublish() {
    publishMutation.mutate(undefined, {
      onSuccess: () => toast({ title: "Monthly update published", description: `Version ${article.version + 1} created.`, variant: "success" }),
      onError: (err) => toast({ title: "Publish failed", description: err.message, variant: "error" }),
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${article.title}"? This cannot be undone.`)) return;
    deleteMutation.mutate(article.id, {
      onSuccess: () => toast({ title: "Article removed", variant: "success" }),
      onError: (err) => toast({ title: "Delete failed", description: err.message, variant: "error" }),
    });
  }

  if (editing) {
    return (
      <ArticleForm
        initial={article}
        onSubmit={handleUpdate}
        onCancel={() => setEditing(false)}
        isPending={updateMutation.isPending}
      />
    );
  }

  const formattedDate = new Date(article.publishedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-base">{article.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{article.category}</Badge>
              <span className="text-[11px] text-muted-foreground">v{article.version}</span>
              <span className="text-[11px] text-muted-foreground">Last updated: {formattedDate}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isAdmin && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  title="Publish Monthly Update"
                  disabled={publishMutation.isPending}
                  onClick={handlePublish}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  title="Edit article"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  title="Delete article"
                  disabled={deleteMutation.isPending}
                  onClick={handleDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <div className="whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-sm leading-relaxed">
            {article.content}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function KnowledgeBasePage() {
  const { user } = useAuth();
  const { data: articles, isLoading } = useKnowledgeBaseArticles();
  const createMutation = useCreateArticle();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showNewForm, setShowNewForm] = useState(false);

  const isAdmin = !!user && ROLE_RANK[user.role] >= ROLE_RANK[UserRole.ADMIN];

  const categories = useMemo(() => {
    if (!articles) return [];
    return ["all", ...Array.from(new Set(articles.map((a) => a.category))).sort()];
  }, [articles]);

  const filtered = useMemo(() => {
    if (!articles) return [];
    const term = search.trim().toLowerCase();
    return articles.filter((a) => {
      if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
      if (term && !a.title.toLowerCase().includes(term) && !a.content.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [articles, search, categoryFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, KnowledgeBaseArticle[]>();
    for (const article of filtered) {
      const list = map.get(article.category) ?? [];
      list.push(article);
      map.set(article.category, list);
    }
    return map;
  }, [filtered]);

  function handleCreate(data: { title: string; content: string; category: string }) {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast({ title: "Article created", variant: "success" });
        setShowNewForm(false);
      },
      onError: (err) => toast({ title: "Create failed", description: err.message, variant: "error" }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <BookOpen className="h-6 w-6 text-primary" />
            Knowledge Base
          </h1>
          <p className="text-sm text-muted-foreground">
            Everything about your company — overview, products, services, FAQs, and case studies.
            {isAdmin ? " Updated monthly by admins." : " View-only for team members."}
          </p>
        </div>
        {isAdmin && !showNewForm && (
          <Button size="sm" className="shrink-0 gap-2" onClick={() => setShowNewForm(true)}>
            <Plus className="h-4 w-4" />
            New Article
          </Button>
        )}
      </div>

      {showNewForm && (
        <ArticleForm
          onSubmit={handleCreate}
          onCancel={() => setShowNewForm(false)}
          isPending={createMutation.isPending}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All categories" : c}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading knowledge base...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            {articles?.length === 0
              ? isAdmin
                ? "No articles yet. Click \"New Article\" to get started."
                : "No articles have been published yet."
              : "No articles match your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([category, categoryArticles]) => (
            <div key={category}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {category}
                <Badge variant="outline" className="font-normal">
                  {categoryArticles.length}
                </Badge>
              </h2>
              <div className="space-y-3">
                {categoryArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} isAdmin={isAdmin} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
