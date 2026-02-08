import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Star, MessageCircle, Reply, Loader2 } from "lucide-react";
import { productService } from "@/services/productService";
import { useToast } from "@/components/ui/ToastContainer";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageBanner } from "@/components/PageBanner";
import { cn } from "@/lib/utils";

export default function BuyerMyReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await productService.getMyReviewsSimple({ page: 1, page_size: 20 });
        setReviews(res.data || []);
      } catch (e) {
        console.error('Failed to load my reviews', e);
        setReviews([]);
        showToast({ title: 'Error', message: 'Failed to load your reviews', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = reviews.filter((r) => {
    const matchesSearch = (r.comment || '').toLowerCase().includes(searchTerm.toLowerCase()) || (r.product?.headline || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRating = ratingFilter === 'all' || String(r.rating) === ratingFilter;
    return matchesSearch && matchesRating;
  });

  const handleBuyerReply = async (reviewId: string) => {
    if (!replyText.trim()) {
      showToast({ title: 'Error', message: 'Please enter a reply', type: 'error' });
      return;
    }

    setReplying(true);
    try {
      const res = await productService.buyerReplyToVendor(reviewId, replyText);
      if (res.success) {
        showToast({ title: 'Success', message: 'Reply posted successfully', type: 'success' });
        setReplyText("");
        setReplyingTo(null);
        // Reload reviews
        const res2 = await productService.getMyReviewsSimple({ page: 1, page_size: 20 });
        setReviews(res2.data || []);
      } else {
        showToast({ title: 'Error', message: res.message || 'Failed to post reply', type: 'error' });
      }
    } catch (error: any) {
      console.error('Error posting reply:', error);
      showToast({ title: 'Error', message: error.message || 'Failed to post reply', type: 'error' });
    } finally {
      setReplying(false);
    }
  };

  return (
    <BuyerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <PageBanner
          title="Reviews"
          subtitle="All reviews you have submitted."
          type="buyer"
        />

        {/* Filters - Glass Bar */}
        <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-[2rem] p-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative group">
              <Input
                placeholder="Search by product or comment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 bg-black/40 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-theme-cyan/50 focus:ring-theme-cyan/10 transition-all rounded-2xl shadow-2xl pl-12"
              />
              <MessageCircle className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5 group-focus-within:text-theme-cyan transition-colors" />
            </div>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-full sm:w-48 h-12 bg-black/40 border-gray-700/50 text-gray-300 rounded-2xl focus:ring-theme-cyan/10">
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent className="bg-gray-950 border-gray-800 text-gray-300 rounded-2xl">
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-12 text-center shadow-2xl">
              <div className="flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-theme-cyan" />
                <span className="text-gray-400 font-medium tracking-wide">Syncing Reviews...</span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-16 text-center shadow-2xl">
              <MessageCircle className="w-16 h-16 text-gray-500 mx-auto mb-6 opacity-20" />
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">No Reviews Found</h3>
              <p className="text-gray-400 mt-2 italic">You haven't submitted any reviews matching these criteria.</p>
            </div>
          ) : (
            filtered.map((r) => (
              <div key={r.id} className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl overflow-hidden hover:border-gray-600/50 transition-all duration-300 shadow-xl group p-6 sm:p-8">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5 bg-black/20 p-2 rounded-xl border border-white/5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} className={`w-4 h-4 ${i <= r.rating ? 'text-yellow-400 fill-current' : 'text-gray-700'}`} />
                      ))}
                      <span className="ml-2 text-xs font-black text-white/50">{r.rating}/5</span>
                    </div>
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">{new Date(r.created_at).toLocaleString()}</span>
                  </div>

                  <div className="space-y-4">
                    <p className="text-gray-200 text-base sm:text-lg leading-relaxed italic break-words">"{r.comment}"</p>
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 bg-theme-cyan/10 border border-theme-cyan/20 rounded-lg">
                        <span className="text-theme-cyan text-[10px] font-black uppercase tracking-widest">Acquisition: {r.product?.headline || 'Unknown Product'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Conversation Chain */}
                  {(r.vendor_reply || (r.conversation && r.conversation.length > 0)) && (
                    <div className="mt-4 pt-6 border-t border-white/5 space-y-4">
                      {/* Show conversation chain */}
                      {r.conversation && r.conversation.length > 0 ? (
                        r.conversation.map((msg: any, idx: number) => (
                          <div
                            key={idx}
                            className={cn(
                              "p-4 rounded-2xl border backdrop-blur-md relative overflow-hidden",
                              msg.author === 'vendor'
                                ? 'bg-theme-cyan/5 border-theme-cyan/20 ml-4 sm:ml-8'
                                : 'bg-white/5 border-white/10'
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest",
                                  msg.author === 'vendor' ? 'text-theme-cyan' : 'text-gray-400'
                                )}>
                                  {msg.author === 'vendor' ? 'AccountzClub Vendor' : 'Transmission (You)'}
                                </span>
                              </div>
                              {msg.date && (
                                <span className="text-[10px] text-gray-500 font-medium">
                                  {new Date(msg.date).toLocaleString()}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed">{msg.message}</p>
                          </div>
                        ))
                      ) : (
                        /* Fallback to legacy vendor_reply if no conversation array */
                        r.vendor_reply && (
                          <div className="p-4 rounded-2xl bg-theme-cyan/5 border border-theme-cyan/20 ml-4 sm:ml-8 backdrop-blur-md">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-theme-cyan text-[10px] font-black uppercase tracking-widest">AccountzClub Vendor</span>
                              {r.vendor_reply_date && (
                                <span className="text-[10px] text-gray-500 font-medium">
                                  {new Date(r.vendor_reply_date).toLocaleString()}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed">{r.vendor_reply}</p>
                          </div>
                        )
                      )}

                      {/* Reply button - show if we want to allow ongoing thread */}
                      <div className="flex justify-end pt-2">
                        <Dialog open={replyingTo === r.id} onOpenChange={(open) => {
                          if (!open) {
                            setReplyingTo(null);
                            setReplyText("");
                          } else {
                            setReplyingTo(r.id);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="h-10 px-6 bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-theme-cyan/10 hover:border-theme-cyan/50 rounded-xl font-bold tracking-widest uppercase transition-all text-xs">
                              <Reply className="w-4 h-4 mr-2" />
                              Continuum Reply
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="w-[95vw] sm:max-w-md bg-gray-950 border-white/10 rounded-3xl p-6 backdrop-blur-2xl shadow-3xl">
                            <DialogHeader className="mb-4">
                              <DialogTitle className="text-xl font-black text-white uppercase tracking-tighter">AccountzClub Transmission</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                              <Textarea
                                placeholder="Encode your reply..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="min-h-32 bg-black/40 border-white/10 text-white placeholder:text-gray-600 focus:border-theme-cyan/50 focus:ring-theme-cyan/10 rounded-2xl"
                              />
                              <div className="flex justify-end gap-3">
                                <Button
                                  variant="ghost"
                                  className="text-gray-500 hover:text-white"
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setReplyText("");
                                  }}
                                >
                                  Abort
                                </Button>
                                <Button
                                  onClick={() => handleBuyerReply(r.id)}
                                  disabled={replying}
                                  className="bg-theme-cyan hover:bg-theme-cyan-dark text-black font-black uppercase tracking-widest rounded-xl px-6"
                                >
                                  {replying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Transmit'}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </BuyerLayout>
  );
}


