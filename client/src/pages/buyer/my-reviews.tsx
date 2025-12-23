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
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">My Reviews</h1>
            <p className="text-gray-400 text-sm">All reviews you have submitted</p>
          </div>
        </div>

        <Card className="border border-gray-700 bg-gray-900">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Input
                    placeholder="Search by product or comment..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-3"
                  />
                </div>
              </div>
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Reviews ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="text-gray-400">Loading reviews...</div>
              ) : filtered.length === 0 ? (
                <div className="text-gray-400">No reviews found</div>
              ) : (
                filtered.map((r) => (
                  <div key={r.id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} className={`w-4 h-4 ${i <= r.rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-sm text-gray-200 mb-1">{r.comment}</div>
                    <div className="text-xs text-gray-400 mb-3">Product: {r.product?.headline || ''}</div>

                    {/* Conversation Chain */}
                    {(r.vendor_reply || (r.conversation && r.conversation.length > 0)) && (
                      <div className="mt-3 space-y-2">
                        {/* Show vendor reply if exists and not in conversation yet */}
                        {r.vendor_reply && (!r.conversation || r.conversation.length === 0) && (
                          <div className="ml-4 p-3 bg-theme-cyan-dim rounded-lg border-l-4 border-theme-cyan">
                            <div className="flex items-center space-x-2 mb-2">
                              <MessageCircle className="w-4 h-4 text-theme-cyan" />
                              <span className="font-medium text-theme-cyan text-xs">Vendor Reply</span>
                              {r.vendor_reply_date && (
                                <span className="text-xs text-theme-cyan/70">
                                  {new Date(r.vendor_reply_date).toLocaleString()}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-300 text-sm break-words">{r.vendor_reply}</p>
                          </div>
                        )}

                        {/* Show conversation chain */}
                        {r.conversation && r.conversation.length > 0 && r.conversation.map((msg: any, idx: number) => (
                          <div
                            key={idx}
                            className={`ml-4 p-3 rounded-lg border-l-4 ${msg.author === 'vendor'
                                ? 'bg-theme-cyan-dim border-theme-cyan'
                                : 'bg-theme-red/10 border-theme-red'
                              }`}
                          >
                            <div className="flex items-center space-x-2 mb-2">
                              <MessageCircle className={`w-4 h-4 ${msg.author === 'vendor' ? 'text-theme-cyan' : 'text-theme-red'}`} />
                              <span className={`font-medium text-xs ${msg.author === 'vendor' ? 'text-theme-cyan' : 'text-theme-red'}`}>
                                {msg.author === 'vendor' ? 'Vendor' : 'You'}
                              </span>
                              {msg.date && (
                                <span className={`text-xs ${msg.author === 'vendor' ? 'text-theme-cyan/70' : 'text-theme-red/70'}`}>
                                  {new Date(msg.date).toLocaleString()}
                                </span>
                              )}
                            </div>
                            <p className={`text-sm break-words ${msg.author === 'vendor' ? 'text-gray-300' : 'text-gray-300'}`}>
                              {msg.message}
                            </p>
                          </div>
                        ))}

                        {/* Reply button - show if last message is from vendor */}
                        {r.vendor_reply && (
                          <div className="ml-4 mt-2">
                            <Dialog open={replyingTo === r.id} onOpenChange={(open) => {
                              if (!open) {
                                setReplyingTo(null);
                                setReplyText("");
                              } else {
                                setReplyingTo(r.id);
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="text-xs">
                                  <Reply className="w-3 h-3 mr-2" />
                                  Reply
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Reply to Vendor</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Textarea
                                    placeholder="Write your reply..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    className="min-h-24"
                                  />
                                  <div className="flex justify-end space-x-3">
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setReplyingTo(null);
                                        setReplyText("");
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button onClick={() => handleBuyerReply(r.id)} disabled={replying} className="bg-theme-cyan hover:bg-theme-cyan/90 text-black">
                                      {replying ? (
                                        <>
                                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                          Posting...
                                        </>
                                      ) : (
                                        'Post Reply'
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </BuyerLayout>
  );
}


