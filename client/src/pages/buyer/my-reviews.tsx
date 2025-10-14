import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Star } from "lucide-react";
import { productService } from "@/services/productService";
import { useToast } from "@/components/ui/ToastContainer";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";

export default function BuyerMyReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
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
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} className={`w-4 h-4 ${i <= r.rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-gray-200 mb-1">{r.comment}</div>
                  <div className="text-xs text-gray-400">Product: {r.product?.headline || ''}</div>
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


