import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Search, MoreVertical, Reply, Flag, ThumbsUp, MessageCircle, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { productService } from "@/services/productService";
import { useToast } from "@/components/ui/ToastContainer";
import { getImageUrl } from "@/config/api";

// Placeholder removed; load from API
const staticReviews = [
  {
    id: 1,
    buyer: "crypto_buyer_01",
    product: "Netflix Premium Account (1 Year)",
    rating: 5,
    title: "Excellent service!",
    content: "Account works perfectly and was delivered within minutes. Great communication from the vendor. Highly recommended!",
    date: "2024-01-15",
    verified: true,
    helpful: 12,
    reply: null
  },
  {
    id: 2,
    buyer: "anonymous_buyer",
    product: "Spotify Premium (6 Months)",
    rating: 4,
    title: "Good quality account",
    content: "Account is working well so far. Delivery was quick. Only minor issue was the initial login, but vendor helped resolve it quickly.",
    date: "2024-01-14",
    verified: true,
    helpful: 8,
    reply: {
      content: "Thank you for your feedback! We're glad we could help resolve the login issue quickly. Feel free to reach out if you need any assistance in the future.",
      date: "2024-01-14"
    }
  },
  {
    id: 3,
    buyer: "crypto_buyer_02",
    product: "Disney+ Account (1 Year)",
    rating: 5,
    title: "Perfect!",
    content: "Everything works as described. Fast delivery and great customer service. Will definitely buy again.",
    date: "2024-01-13",
    verified: true,
    helpful: 15,
    reply: null
  },
  {
    id: 4,
    buyer: "crypto_buyer_03",
    product: "Adobe Creative Cloud (1 Year)",
    rating: 3,
    title: "Average experience",
    content: "Account works but had some initial setup issues. Vendor was responsive but took a while to resolve. Overall okay.",
    date: "2024-01-12",
    verified: true,
    helpful: 3,
    reply: null
  },
  {
    id: 5,
    buyer: "anonymous_buyer_2",
    product: "VPN Service (1 Year)",
    rating: 2,
    title: "Had issues",
    content: "Service is working now but had problems for the first few days. Vendor eventually fixed it but communication could be better.",
    date: "2024-01-10",
    verified: false,
    helpful: 1,
    reply: {
      content: "We apologize for the initial issues and delayed communication. We've since improved our support process to prevent similar problems. Thank you for your patience.",
      date: "2024-01-11"
    }
  }
];

const renderStars = (rating: number) => {
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"
            }`}
        />
      ))}
    </div>
  );
};

export default function VendorReviews() {
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replying, setReplying] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadReviews = async () => {
    try {
      setLoading(true);
      const res = await productService.getVendorReviews({ page: 1, page_size: 20 });
      const raw = (res as any)?.data || [];
      const mapped = raw.map((r: any) => ({
        id: r.id,
        buyer: r.buyer?.username || 'Anonymous',
        product: r.product?.headline || 'Product',
        rating: r.rating || 0,
        title: r.title || '',
        content: r.comment || '',
        date: r.created_at || '',
        verified: true,
        helpful: r.helpful_count || 0,
        isHelpful: r.is_helpful || false,
        reply: r.vendor_reply ? {
          content: r.vendor_reply,
          date: r.vendor_reply_date || r.created_at,
        } : null,
        images: r.images || [],
        conversation: r.conversation || [],
      }));
      setReviews(mapped);
    } catch (e) {
      console.error('Failed to load reviews', e);
      setReviews([]);
      showToast({ title: 'Error', message: 'Failed to load reviews', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleHelpfulClick = async (reviewId: string) => {
    try {
      const res = await productService.markReviewHelpful(reviewId);
      if (res.success) {
        setReviews(prev => prev.map(r => 
          r.id === reviewId 
            ? { ...r, helpful: res.data.helpful_count, isHelpful: res.data.is_helpful } 
            : r
        ));
      }
    } catch (e) {
      console.error('Failed to mark helpful', e);
    }
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch =
      review.buyer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRating = ratingFilter === "all" || review.rating.toString() === ratingFilter;
    return matchesSearch && matchesRating;
  });

  const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length : 0;
  const ratingCounts = [1, 2, 3, 4, 5].map(rating => reviews.filter(review => review.rating === rating).length);

  const handleReply = async (reviewId: number) => {
    if (!replyText.trim()) {
      showToast({ title: 'Error', message: 'Please enter a reply', type: 'error' });
      return;
    }

    setReplying(true);
    try {
      const res = await productService.replyToReview(reviewId.toString(), replyText);
      if (res.success) {
        showToast({ title: 'Success', message: 'Reply posted successfully', type: 'success' });
        setReplyText("");
        setReplyingTo(null);
        // Reload reviews
        const res2 = await productService.getVendorReviews({ page: 1, page_size: 20 });
        const raw = (res2 as any)?.data || [];
        const mapped = raw.map((r: any) => ({
          id: r.id,
          buyer: r.buyer?.username || 'Anonymous',
          product: r.product?.headline || 'Product',
          rating: r.rating || 0,
          title: r.title || '',
          content: r.comment || '',
          date: r.created_at || '',
          verified: true,
          helpful: r.helpful || 0,
          reply: r.vendor_reply ? {
            content: r.vendor_reply,
            date: r.vendor_reply_date || r.created_at,
          } : null,
          conversation: r.conversation || [],
        }));
        setReviews(mapped);
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

    <div className="space-y-4 sm:space-y-6 relative z-10 p-3 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter mb-2">Customer Reviews</h1>
          <p className="text-gray-400 text-sm sm:text-base italic">Manage customer feedback and respond to reviews</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="border border-gray-700 bg-gray-900">
          <CardContent className="p-4 sm:p-6">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white">{averageRating.toFixed(1)}</div>
              <div className="flex items-center justify-center my-2">
                {renderStars(Math.round(averageRating))}
              </div>
              <p className="text-xs sm:text-sm text-gray-400">Average Rating</p>
              <p className="text-[10px] sm:text-xs text-gray-400">{reviews.length} total reviews</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-700 bg-gray-900">
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold text-theme-cyan">{ratingCounts[4]}</div>
            <p className="text-xs sm:text-sm text-gray-400">5-Star Reviews</p>
            <p className="text-[10px] sm:text-xs text-gray-400">{reviews.length > 0 ? ((ratingCounts[4] / reviews.length) * 100).toFixed(1) : '0'}% of total</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-700 bg-gray-900">
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold text-theme-red">
              {reviews.filter(r => !r.reply).length}
            </div>
            <p className="text-xs sm:text-sm text-gray-400">Pending Replies</p>
            <p className="text-[10px] sm:text-xs text-gray-400">Need your response</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-700 bg-gray-900">
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold text-theme-cyan">
              {reviews.filter(r => r.verified).length}
            </div>
            <p className="text-xs sm:text-sm text-gray-400">Verified Reviews</p>
            <p className="text-[10px] sm:text-xs text-gray-400">From confirmed buyers</p>
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution */}
      <Card className="border border-gray-700 bg-gray-900">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl font-bold text-white">Rating Distribution</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-2 sm:space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center space-x-2 sm:space-x-4">
                <div className="flex items-center space-x-1 sm:space-x-2 w-16 sm:w-20 flex-shrink-0">
                  <span className="text-xs sm:text-sm font-medium">{rating}</span>
                  <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 fill-current" />
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-theme-cyan h-2 rounded-full transition-all duration-500"
                    style={{ width: `${reviews.length > 0 ? (ratingCounts[rating - 1] / reviews.length) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-xs sm:text-sm text-gray-400 w-8 sm:w-12 text-right flex-shrink-0">{ratingCounts[rating - 1]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border border-gray-700 bg-gray-900">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search reviews, buyers, products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm sm:text-base"
                />
              </div>
            </div>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-full sm:w-48 text-sm sm:text-base">
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

      {/* Reviews List */}
      <Card className="border border-gray-700 bg-gray-900">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl font-bold text-white">
            Reviews ({filteredReviews.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            {loading ? (
              <div className="text-gray-400 text-sm sm:text-base text-center py-8">Loading reviews...</div>
            ) : filteredReviews.map((review) => (
              <div key={review.id} className="border-b border-gray-700 bg-gray-900 pb-4 sm:pb-6 last:border-b-0 last:pb-0">
                <div className="flex items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-theme-cyan-dim rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-theme-cyan font-semibold text-xs sm:text-sm">
                        {review.buyer.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h4 className="font-medium text-white text-sm sm:text-base truncate">{review.buyer}</h4>
                        {review.verified && (
                          <Badge variant="outline" className="text-[10px] sm:text-xs bg-theme-cyan/10 text-theme-cyan border-theme-cyan/20 flex-shrink-0">
                            Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-400 break-words">{review.product}</p>
                      <p className="text-[10px] sm:text-xs text-gray-400">{new Date(review.date).toLocaleString()}</p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[90vw] sm:w-auto">
                      <DropdownMenuItem className="text-xs sm:text-sm">
                        <Flag className="w-4 h-4 mr-2" />
                        Report Review
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mb-3 sm:mb-4">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
                    {renderStars(review.rating)}
                  </div>
                  <p className="text-gray-200 text-sm sm:text-base break-words">{review.content}</p>
                  
                  {/* Render review images if available */}
                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                      {review.images.map((img: string, idx: number) => (
                        <a key={idx} href={getImageUrl(img)} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                          <img 
                            src={getImageUrl(img)} 
                            alt={`Review attachment ${idx + 1}`} 
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-md border border-gray-700 hover:opacity-80 transition-opacity" 
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <button 
                      onClick={() => handleHelpfulClick(review.id)}
                      className={`flex items-center space-x-1 transition-colors ${review.isHelpful ? 'text-theme-cyan' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                      <ThumbsUp className={`w-3 h-3 sm:w-4 sm:h-4 ${review.isHelpful ? 'fill-current' : ''}`} />
                      <span className="text-xs sm:text-sm">{review.helpful} helpful</span>
                    </button>
                  </div>

                  {!review.reply && (
                    <Dialog open={replyingTo === review.id} onOpenChange={(open) => {
                      if (!open) {
                        setReplyingTo(null);
                        setReplyText("");
                      } else {
                        setReplyingTo(review.id);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="w-full sm:w-auto text-xs sm:text-sm">
                          <Reply className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Reply</span>
                          <span className="sm:hidden">Reply</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[95vw] sm:max-w-md mx-4 sm:mx-auto">
                        <DialogHeader>
                          <DialogTitle className="text-base sm:text-lg">Reply to Review</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="bg-gray-800 p-3 sm:p-4 rounded-lg">
                            <div className="flex items-center space-x-2 mb-2 flex-wrap">
                              {renderStars(review.rating)}
                            </div>
                            <p className="text-gray-300 text-xs sm:text-sm break-words">{review.content}</p>
                          </div>
                          <Textarea
                            placeholder="Write your reply..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="min-h-24 text-sm sm:text-base"
                          />
                          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                            <Button
                              variant="outline"
                              className="w-full sm:w-auto text-sm sm:text-base"
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyText("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => handleReply(review.id)}
                              className="w-full sm:w-auto text-sm sm:text-base"
                              disabled={replying}
                            >
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
                  )}
                </div>

                {/* Conversation Chain */}
                {(review.reply || (review.conversation && review.conversation.length > 0)) && (
                  <div className="mt-3 sm:mt-4 ml-0 sm:ml-14 space-y-2">
                    {/* Show vendor reply if exists and not in conversation yet */}
                    {review.reply && (!review.conversation || review.conversation.length === 0) && (
                      <div className="p-3 sm:p-4 bg-theme-cyan/10 rounded-lg border-l-4 border-theme-cyan">
                        <div className="flex items-center space-x-2 mb-2 flex-wrap">
                          <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 text-theme-cyan" />
                          <span className="font-medium text-theme-cyan text-xs sm:text-sm">Your Reply</span>
                          <span className="text-[10px] sm:text-xs text-theme-cyan/70">{new Date(review.reply.date).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-300 text-xs sm:text-sm break-words">{review.reply.content}</p>
                      </div>
                    )}

                    {/* Show conversation chain */}
                    {review.conversation && review.conversation.length > 0 && review.conversation.map((msg: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-3 sm:p-4 rounded-lg border-l-4 ${msg.author === 'vendor'
                          ? 'bg-theme-cyan/10 border-theme-cyan'
                          : 'bg-theme-red/10 border-theme-red'
                          }`}
                      >
                        <div className="flex items-center space-x-2 mb-2 flex-wrap">
                          <MessageCircle className={`w-3 h-3 sm:w-4 sm:h-4 ${msg.author === 'vendor' ? 'text-theme-cyan' : 'text-theme-red'}`} />
                          <span className={`font-medium text-xs sm:text-sm ${msg.author === 'vendor' ? 'text-theme-cyan' : 'text-theme-red'}`}>
                            {msg.author === 'vendor' ? 'You' : review.buyer}
                          </span>
                          {msg.date && (
                            <span className={`text-[10px] sm:text-xs ${msg.author === 'vendor' ? 'text-theme-cyan/70' : 'text-theme-red/70'}`}>
                              {new Date(msg.date).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs sm:text-sm break-words ${msg.author === 'vendor' ? 'text-gray-300' : 'text-gray-300'}`}>
                          {msg.message}
                        </p>
                      </div>
                    ))}

                    {/* Reply button - show if last message is from buyer or no conversation yet */}
                    {((review.conversation && review.conversation.length > 0 && review.conversation[review.conversation.length - 1].author === 'buyer') || (!review.conversation || review.conversation.length === 0)) && (
                      <div className="mt-2">
                        <Dialog open={replyingTo === review.id} onOpenChange={(open) => {
                          if (!open) {
                            setReplyingTo(null);
                            setReplyText("");
                          } else {
                            setReplyingTo(review.id);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-xs sm:text-sm">
                              <Reply className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Reply</span>
                              <span className="sm:hidden">Reply</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[95vw] sm:max-w-md mx-4 sm:mx-auto">
                            <DialogHeader>
                              <DialogTitle className="text-base sm:text-lg">Reply to Buyer</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Textarea
                                placeholder="Write your reply..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="min-h-24 text-sm sm:text-base"
                              />
                              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                                <Button
                                  variant="outline"
                                  className="w-full sm:w-auto text-sm sm:text-base"
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setReplyText("");
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() => handleReply(review.id)}
                                  className="w-full sm:w-auto text-sm sm:text-base"
                                  disabled={replying}
                                >
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
            ))}
          </div>

          {filteredReviews.length === 0 && !loading && (
            <div className="text-center py-8 sm:py-12">
              <div className="text-gray-400 mb-3 sm:mb-4">
                <Star className="w-10 h-10 sm:w-12 sm:h-12 mx-auto" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-white mb-2">No reviews found</h3>
              <p className="text-gray-400 text-sm sm:text-base">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>

  );
}
