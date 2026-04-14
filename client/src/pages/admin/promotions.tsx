import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/authService";
import { Zap, Megaphone, ExternalLink, Ban, Trash2, Pencil, Loader2, Clock, Eye, Tag, DollarSign, User, RefreshCw, Play, CalendarDays } from "lucide-react";
import { format } from "date-fns";

interface HighlightProduct {
  id: number;
  listing_title?: string;
  headline?: string;
  vendor?: { id: number; username: string };
  vendor_username?: string;
  highlighted_until?: string | null;
  is_giveaway?: boolean;
  status?: string;
  price?: string | number;
  views_count?: number;
  category_name?: string;
}

interface VendorAnnouncement {
  id: string;
  title: string;
  content: string;
  audience: string;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  priority?: string;
  created_by_username?: string;
}

export default function AdminPromotions() {
  const { toast } = useToast();
  const [highlights, setHighlights] = useState<HighlightProduct[]>([]);
  const [announcements, setAnnouncements] = useState<VendorAnnouncement[]>([]);
  const [loadingH, setLoadingH] = useState(true);
  const [loadingA, setLoadingA] = useState(true);
  const [endingId, setEndingId] = useState<number | null>(null);
  const [confirmEnd, setConfirmEnd] = useState<HighlightProduct | null>(null);
  const [confirmDeleteAnn, setConfirmDeleteAnn] = useState<VendorAnnouncement | null>(null);
  const [editAnn, setEditAnn] = useState<VendorAnnouncement | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editPriority, setEditPriority] = useState("normal");
  const [editAudience, setEditAudience] = useState("all");
  const [savingAnn, setSavingAnn] = useState(false);
  const [extendHighlight, setExtendHighlight] = useState<HighlightProduct | null>(null);
  const [extendHours, setExtendHours] = useState("12");
  const [extending, setExtending] = useState(false);

  const loadHighlights = useCallback(async () => {
    setLoadingH(true);
    try {
      const res = await api.get("/products/admin/promotions/highlights/");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setHighlights(res.data.data);
      } else {
        setHighlights([]);
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.response?.data?.message || "Could not load featured highlights",
        variant: "destructive",
      });
      setHighlights([]);
    } finally {
      setLoadingH(false);
    }
  }, [toast]);

  const loadVendorAnnouncements = useCallback(async () => {
    setLoadingA(true);
    try {
      const res = await api.get("/system/announcements/", {
        params: { scope: "vendor_promotions" },
      });
      const raw = res.data;
      const rows = Array.isArray(raw) ? raw : raw?.results || [];
      setAnnouncements(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.response?.data?.message || "Could not load vendor promotion blasts",
        variant: "destructive",
      });
      setAnnouncements([]);
    } finally {
      setLoadingA(false);
    }
  }, [toast]);

  useEffect(() => {
    loadHighlights();
    loadVendorAnnouncements();
  }, [loadHighlights, loadVendorAnnouncements]);

  const highlightLive = (p: HighlightProduct) => {
    if (!p.highlighted_until) return false;
    return new Date(p.highlighted_until) > new Date();
  };
  const announcementLive = (a: VendorAnnouncement) => {
    const now = new Date();
    const end = a.end_date ? new Date(a.end_date) : null;
    return a.is_active && (!end || end > now);
  };

  const endHighlight = async (p: HighlightProduct) => {
    setEndingId(p.id);
    try {
      await api.post(`/products/admin/promotions/highlights/${p.id}/end/`);
      toast({ title: "Done", description: "Featured highlight removed." });
      setConfirmEnd(null);
      await loadHighlights();
    } catch (e: any) {
      toast({
        title: "Failed",
        description: e.response?.data?.message || "Could not end highlight",
        variant: "destructive",
      });
    } finally {
      setEndingId(null);
    }
  };

  const handleExtendHighlight = async () => {
    if (!extendHighlight) return;
    setExtending(true);
    try {
      await api.post(`/products/admin/promotions/highlights/${extendHighlight.id}/extend/`, {
        hours: parseInt(extendHours),
      });
      toast({ title: "Extended", description: `Highlight extended by ${extendHours} hours.` });
      setExtendHighlight(null);
      await loadHighlights();
    } catch (e: any) {
      toast({
        title: "Failed",
        description: e.response?.data?.message || "Could not extend highlight",
        variant: "destructive",
      });
    } finally {
      setExtending(false);
    }
  };

  const deactivateAnnouncement = async (a: VendorAnnouncement) => {
    try {
      await api.patch(`/system/announcements/${a.id}/`, {
        is_active: false,
        end_date: new Date().toISOString(),
      });
      toast({ title: "Updated", description: "Announcement deactivated." });
      await loadVendorAnnouncements();
    } catch (e: any) {
      toast({
        title: "Failed",
        description: e.response?.data?.detail || e.message,
        variant: "destructive",
      });
    }
  };

  const deleteAnnouncement = async (a: VendorAnnouncement) => {
    try {
      await api.delete(`/system/announcements/${a.id}/`);
      toast({ title: "Deleted", description: "Promotion announcement removed." });
      setConfirmDeleteAnn(null);
      await loadVendorAnnouncements();
    } catch (e: any) {
      toast({
        title: "Failed",
        description: e.response?.data?.detail || e.message,
        variant: "destructive",
      });
    }
  };

  const reactivateAnnouncement = async (a: VendorAnnouncement) => {
    try {
      await api.patch(`/system/announcements/${a.id}/`, {
        is_active: true,
        end_date: null,
      });
      toast({ title: "Updated", description: "Announcement reactivated." });
      await loadVendorAnnouncements();
    } catch (e: any) {
      toast({
        title: "Failed",
        description: e.response?.data?.detail || e.message,
        variant: "destructive",
      });
    }
  };

  const openEdit = (a: VendorAnnouncement) => {
    setEditAnn(a);
    setEditTitle(a.title);
    setEditContent(a.content || "");
    setEditPriority(a.priority || "normal");
    setEditAudience(a.audience || "all");
  };

  const saveEdit = async () => {
    if (!editAnn) return;
    setSavingAnn(true);
    try {
      await api.patch(`/system/announcements/${editAnn.id}/`, {
        title: editTitle,
        content: editContent,
        priority: editPriority,
        audience: editAudience,
      });
      toast({ title: "Saved", description: "Announcement updated." });
      setEditAnn(null);
      await loadVendorAnnouncements();
    } catch (e: any) {
      toast({
        title: "Failed",
        description: e.response?.data?.detail || e.message,
        variant: "destructive",
      });
    } finally {
      setSavingAnn(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-bg p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Megaphone className="w-7 h-7 text-accent" />
          Promotions & seller ads
        </h1>
        <p className="text-gray-400 mt-1 text-sm max-w-3xl">
          Manage live featured listings (12h highlights) and paid vendor announcement blasts. End or
          edit anything that violates policy.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" className="border-gray-700 text-gray-300" onClick={loadHighlights}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh highlights
          </Button>
          <Button variant="outline" className="border-gray-700 text-gray-300" onClick={loadVendorAnnouncements}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh announcements
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <Card className="crypto-card border-gray-800">
          <CardContent className="pt-6">
            <p className="text-xs text-gray-500">Highlighted listings</p>
            <p className="text-2xl font-semibold text-white">{highlights.length}</p>
          </CardContent>
        </Card>
        <Card className="crypto-card border-gray-800">
          <CardContent className="pt-6">
            <p className="text-xs text-gray-500">Live highlights</p>
            <p className="text-2xl font-semibold text-emerald-300">
              {highlights.filter((h) => highlightLive(h)).length}
            </p>
          </CardContent>
        </Card>
        <Card className="crypto-card border-gray-800">
          <CardContent className="pt-6">
            <p className="text-xs text-gray-500">Vendor blast records</p>
            <p className="text-2xl font-semibold text-white">{announcements.length}</p>
          </CardContent>
        </Card>
        <Card className="crypto-card border-gray-800">
          <CardContent className="pt-6">
            <p className="text-xs text-gray-500">Live blasts</p>
            <p className="text-2xl font-semibold text-emerald-300">
              {announcements.filter((a) => announcementLive(a)).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="crypto-card border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            Featured listing highlights
          </CardTitle>
          <CardDescription className="text-gray-400">
            Seller “Featured offer” pins. Removing here clears the flag immediately for all buyers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingH ? (
            <div className="flex justify-center py-12 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : highlights.length === 0 ? (
            <p className="text-gray-500 text-sm py-6">No products currently have the highlight flag set.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-transparent">
                    <TableHead className="text-gray-400">Product Listing</TableHead>
                    <TableHead className="text-gray-400">Price / Category</TableHead>
                    <TableHead className="text-gray-400">Vendor</TableHead>
                    <TableHead className="text-gray-400">Performance</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Until</TableHead>
                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {highlights.map((p) => {
                    const live = highlightLive(p);
                    const title = p.listing_title || p.headline || `#${p.id}`;
                    const vendor = p.vendor?.username || p.vendor_username || "—";
                    return (
                      <TableRow key={p.id} className="border-gray-800 group hover:bg-white/[0.02] transition-colors">
                        <TableCell className="text-white font-medium max-w-[220px]">
                          <div className="flex flex-col gap-0.5">
                            <span className="truncate block">{title}</span>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">ID: {p.id}</span>
                          </div>
                          {p.is_giveaway ? (
                            <Badge className="mt-1 text-[10px] bg-cyan-600/30 text-cyan-200 border-0">
                              Giveaway
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-emerald-400">
                              <DollarSign className="w-3 h-3" />
                              <span className="font-mono text-sm">{p.price ? `$${parseFloat(String(p.price)).toFixed(2)}` : "FREE"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                              <Tag className="w-3 h-3" />
                              <span>{p.category_name || "Uncategorized"}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                                <User className="w-3 h-3 text-accent" />
                             </div>
                             <span>{vendor}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                           <div className="flex items-center gap-1.5 text-gray-400">
                              <Eye className="w-3.5 h-3.5" />
                              <span className="text-sm">{p.views_count || 0} views</span>
                           </div>
                        </TableCell>
                        <TableCell>
                          {live ? (
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                              Live
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-200 border-amber-500/30">
                              Expired / stuck
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-400 text-sm">
                          <div className="flex items-center gap-1.5 font-mono">
                            <Clock className="w-3.5 h-3.5 text-gray-500" />
                            {p.highlighted_until
                              ? format(new Date(p.highlighted_until), "MMM d, HH:mm")
                              : "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-700 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                            asChild
                          >
                            <a
                              href={`/buyer/product/${p.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View
                            </a>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-blue-900/50 text-blue-300 hover:bg-blue-600 hover:text-white transition-colors"
                            onClick={() => setExtendHighlight(p)}
                          >
                             Extend
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="bg-red-900/40 hover:bg-red-900/70 text-red-200 border border-red-800"
                            onClick={() => setConfirmEnd(p)}
                          >
                            <Ban className="w-3.5 h-3.5 mr-1" />
                            End
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="crypto-card border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-accent" />
            Vendor announcement blasts
          </CardTitle>
          <CardDescription className="text-gray-400">
            Paid “global announcement” promos (all users). Deactivate to hide immediately, or delete /
            edit copy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingA ? (
            <div className="flex justify-center py-12 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : announcements.length === 0 ? (
            <p className="text-gray-500 text-sm py-6">No vendor-paid announcements on record.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-transparent">
                    <TableHead className="text-gray-400">Announcement Title</TableHead>
                    <TableHead className="text-gray-400">Content</TableHead>
                    <TableHead className="text-gray-400">Target Audience</TableHead>
                    <TableHead className="text-gray-400">Priority</TableHead>
                    <TableHead className="text-gray-400">Window</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Vendor / Author</TableHead>
                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((a) => {
                    const windowOk = announcementLive(a);
                    return (
                      <TableRow key={a.id} className="border-gray-800 hover:bg-white/[0.02] transition-colors">
                        <TableCell className="text-white font-medium max-w-[260px] truncate">
                          <div className="flex flex-col gap-0.5">
                            <span>{a.title}</span>
                            <div className="flex items-center gap-2 text-gray-500 text-[10px]">
                               <span>Start: {a.start_date ? format(new Date(a.start_date), "MMM d HH:mm") : "—"}</span>
                               <span>•</span>
                               <span>End: {a.end_date ? format(new Date(a.end_date), "MMM d HH:mm") : "—"}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-400 max-w-[220px]">
                          <p className="text-xs line-clamp-2">{a.content || "—"}</p>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-gray-800 text-gray-300 border-gray-700 capitalize">
                             {a.audience}
                          </Badge>
                        </TableCell>
                        <TableCell>
                           {a.priority === 'high' ? (
                             <Badge className="bg-red-500/20 text-red-400 border-red-500/30">High</Badge>
                           ) : a.priority === 'normal' ? (
                             <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Normal</Badge>
                           ) : (
                             <Badge className="bg-gray-600/30 text-gray-400 border-gray-600">Low</Badge>
                           )}
                        </TableCell>
                        <TableCell className="text-gray-400 text-xs">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="w-3 h-3" />
                            <span>
                              {a.start_date ? format(new Date(a.start_date), "MMM d HH:mm") : "—"}
                              {" → "}
                              {a.end_date ? format(new Date(a.end_date), "MMM d HH:mm") : "Open"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {windowOk ? (
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                              Live
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-700/40 text-gray-300 border-gray-700">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-300">
                           <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-gray-500" />
                              {a.created_by_username || "System"}
                           </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-gray-700 text-gray-300"
                              onClick={() => openEdit(a)}
                            >
                              <Pencil className="w-3.5 h-3.5 mr-1" />
                              Edit
                            </Button>
                            {windowOk ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-amber-800/60 text-amber-200"
                                onClick={() => deactivateAnnouncement(a)}
                              >
                                Stop
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-emerald-800/60 text-emerald-200"
                                onClick={() => reactivateAnnouncement(a)}
                              >
                                <Play className="w-3.5 h-3.5 mr-1" />
                                Reactivate
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300 hover:bg-red-950/40"
                              onClick={() => setConfirmDeleteAnn(a)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmEnd} onOpenChange={() => setConfirmEnd(null)}>
        <AlertDialogContent className="bg-gray-950 border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>End featured highlight?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This removes the seller promotion from search spotlight immediately. The listing itself
              is not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 bg-transparent text-gray-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-700 hover:bg-red-600 text-white"
              disabled={endingId !== null}
              onClick={() => confirmEnd && endHighlight(confirmEnd)}
            >
              {endingId !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : "End highlight"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDeleteAnn} onOpenChange={() => setConfirmDeleteAnn(null)}>
        <AlertDialogContent className="bg-gray-950 border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Permanently removes this vendor promotion from the database. Buyers will no longer see
              it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 bg-transparent text-gray-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-700 hover:bg-red-600 text-white"
              onClick={() => confirmDeleteAnn && deleteAnnouncement(confirmDeleteAnn)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editAnn} onOpenChange={(o) => !o && setEditAnn(null)}>
        <DialogContent className="bg-gray-950 border-gray-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-gray-400">Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="bg-black/40 border-gray-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1 block">Priority</Label>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
                className="w-full bg-black/40 border-gray-700 text-white rounded-md h-9 px-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-accent appearance-none"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'white\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '0.875rem' }}
              >
                <option value="low" className="bg-gray-950">Low</option>
                <option value="normal" className="bg-gray-950">Normal</option>
                <option value="high" className="bg-gray-950">High</option>
              </select>
            </div>
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1 block">Audience</Label>
              <select
                value={editAudience}
                onChange={(e) => setEditAudience(e.target.value)}
                className="w-full bg-black/40 border-gray-700 text-white rounded-md h-9 px-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-accent appearance-none"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'white\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '0.875rem' }}
              >
                <option value="all" className="bg-gray-950">All Users</option>
                <option value="buyer" className="bg-gray-950">Buyers Only</option>
                <option value="vendor" className="bg-gray-950">Vendors Only</option>
                <option value="admin" className="bg-gray-950">Admins Only</option>
              </select>
            </div>
            <div>
              <Label className="text-gray-400">Content (HTML allowed)</Label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={6}
                className="bg-black/40 border-gray-700 text-white mt-1 font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditAnn(null)} className="text-gray-400">
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={savingAnn} className="bg-accent text-bg">
              {savingAnn ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!extendHighlight} onOpenChange={(o) => !o && setExtendHighlight(null)}>
        <DialogContent className="bg-gray-950 border-gray-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
               <Clock className="w-5 h-5 text-accent" />
               Extend Highlight
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="text-sm text-gray-400">
                You are adding extra time to the spotlight window for:
                <div className="text-white font-medium mt-1">
                   {extendHighlight?.headline || extendHighlight?.listing_title}
                </div>
             </div>
             <div>
                <Label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">Extension Duration</Label>
                <select
                  value={extendHours}
                  onChange={(e) => setExtendHours(e.target.value)}
                  className="w-full bg-black/40 border-gray-700 text-white rounded-md h-10 px-3 pr-10 focus:outline-none focus:ring-1 focus:ring-accent appearance-none"
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'white\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                >
                  <option value="6" className="bg-gray-950">Add 6 Hours</option>
                  <option value="12" className="bg-gray-950">Add 12 Hours (Standard)</option>
                  <option value="24" className="bg-gray-950">Add 24 Hours (Full Day)</option>
                  <option value="48" className="bg-gray-950">Add 48 Hours</option>
                  <option value="168" className="bg-gray-950">Add 7 Days (Week)</option>
                </select>
             </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExtendHighlight(null)} className="text-gray-400">
              Cancel
            </Button>
            <Button 
               onClick={handleExtendHighlight} 
               disabled={extending} 
               className="bg-accent text-bg hover:bg-accent/90"
            >
              {extending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply Extension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
