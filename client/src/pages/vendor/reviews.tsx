import { useState } from "react";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Search, MoreVertical, Reply, Flag, ThumbsUp, MessageCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const reviews = [
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
          className={`w-4 h-4 ${
            star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"
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

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      review.buyer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRating = ratingFilter === "all" || review.rating.toString() === ratingFilter;
    return matchesSearch && matchesRating;
  });

  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  const ratingCounts = [1, 2, 3, 4, 5].map(rating => 
    reviews.filter(review => review.rating === rating).length
  );

  const handleReply = (reviewId: number) => {
    // Handle reply submission
    console.log(`Replying to review ${reviewId}: ${replyText}`);
    setReplyText("");
    setReplyingTo(null);
  };

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customer Reviews</h1>
            <p className="text-gray-600">Manage customer feedback and respond to reviews</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
                <div className="flex items-center justify-center my-2">
                  {renderStars(Math.round(averageRating))}
                </div>
                <p className="text-sm text-gray-600">Average Rating</p>
                <p className="text-xs text-gray-500">{reviews.length} total reviews</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">{ratingCounts[4]}</div>
              <p className="text-sm text-gray-600">5-Star Reviews</p>
              <p className="text-xs text-gray-500">{((ratingCounts[4] / reviews.length) * 100).toFixed(1)}% of total</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-blue-600">
                {reviews.filter(r => !r.reply).length}
              </div>
              <p className="text-sm text-gray-600">Pending Replies</p>
              <p className="text-xs text-gray-500">Need your response</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-purple-600">
                {reviews.filter(r => r.verified).length}
              </div>
              <p className="text-sm text-gray-600">Verified Reviews</p>
              <p className="text-xs text-gray-500">From confirmed buyers</p>
            </CardContent>
          </Card>
        </div>

        {/* Rating Distribution */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 w-20">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(ratingCounts[rating - 1] / reviews.length) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12">{ratingCounts[rating - 1]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search reviews, buyers, products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
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

        {/* Reviews List */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">
              Reviews ({filteredReviews.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {filteredReviews.map((review) => (
                <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {review.buyer.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{review.buyer}</h4>
                          {review.verified && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{review.product}</p>
                        <p className="text-xs text-gray-500">{review.date}</p>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Flag className="w-4 h-4 mr-2" />
                          Report Review
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center space-x-3 mb-2">
                      {renderStars(review.rating)}
                      <h3 className="font-semibold text-gray-900">{review.title}</h3>
                    </div>
                    <p className="text-gray-700">{review.content}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button className="flex items-center space-x-1 text-gray-500 hover:text-gray-700">
                        <ThumbsUp className="w-4 h-4" />
                        <span className="text-sm">{review.helpful} helpful</span>
                      </button>
                    </div>

                    {!review.reply && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Reply className="w-4 h-4 mr-2" />
                            Reply
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reply to Review</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <div className="flex items-center space-x-2 mb-2">
                                {renderStars(review.rating)}
                                <span className="font-semibold">{review.title}</span>
                              </div>
                              <p className="text-gray-700">{review.content}</p>
                            </div>
                            <Textarea
                              placeholder="Write your reply..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              className="min-h-24"
                            />
                            <div className="flex justify-end space-x-3">
                              <Button variant="outline">Cancel</Button>
                              <Button onClick={() => handleReply(review.id)}>
                                Post Reply
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  {review.reply && (
                    <div className="mt-4 ml-14 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <div className="flex items-center space-x-2 mb-2">
                        <MessageCircle className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-blue-900">Your Reply</span>
                        <span className="text-xs text-blue-600">{review.reply.date}</span>
                      </div>
                      <p className="text-blue-800">{review.reply.content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredReviews.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Star className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </VendorLayout>
  );
}