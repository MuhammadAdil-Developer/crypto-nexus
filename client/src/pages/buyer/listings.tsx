import { useState, useEffect } from "react";
import { Search, Filter, Grid, List as ListIcon, ChevronDown, Star, Eye, Heart } from "lucide-react";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { ProductCard } from "@/components/buyer/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

// API Service
const API_BASE_URL = 'http://localhost:8000/api/v1';

interface Product {
  id: number;
  listing_title: string;
  description: string;
  vendor: {
    id: number;
    username: string;
    email: string;
  };
  category: {
    id: number;
    name: string;
  };
  sub_category: {
    id: number;
    name: string;
  };
  price: string;
  account_type: string;
  verification_level: string;
  delivery_method: string;
  status: string;
  created_at: string;
  main_images: string[];
  tags: string[];
  special_features: string[];
  quantity_available: number;
  rating?: number;
  review_count?: number;
}

export default function BuyerListings() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<{id: string, name: string, count: number}[]>([]);
  const { toast } = useToast();

  // Fetch products from API
  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter and sort products
  useEffect(() => {
    let filtered = products;

    // Apply category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => 
        product.category.name.toLowerCase().replace(/\s+/g, '-') === selectedCategory
      );
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(product => 
        product.listing_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.vendor.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply sorting
    switch (sortBy) {
      case "newest":
        filtered = [...filtered].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "oldest":
        filtered = [...filtered].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case "price-low":
        filtered = [...filtered].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        break;
      case "price-high":
        filtered = [...filtered].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        break;
      case "rating":
        filtered = [...filtered].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "popular":
        filtered = [...filtered].sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
        break;
      default:
        break;
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory, sortBy]);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login to access listings",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/products/buyer/listings/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📦 Buyer Listings Response:', data);
        
        setProducts(data.results || []);
        setFilteredProducts(data.results || []);
        
        // Extract categories from products
        const categoryMap = new Map();
        data.results?.forEach((product: Product) => {
          const catName = product.category.name;
          categoryMap.set(catName, (categoryMap.get(catName) || 0) + 1);
        });
        
        const categoryList = Array.from(categoryMap.entries()).map(([name, count]) => ({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          count: count as number
        }));
        
        setCategories([
          { id: "all", name: "All Categories", count: data.results?.length || 0 },
          ...categoryList
        ]);
        
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch listings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to fetch listings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId === "all") {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(product => product.category.name.toLowerCase() === categoryId));
    }
  };

  const handleSortChange = (sortOption: string) => {
    setSortBy(sortOption);
    let sortedProducts = [...filteredProducts];

    if (sortOption === "newest") {
      sortedProducts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortOption === "price-low") {
      sortedProducts.sort((a, b) => parseFloat(a.price.replace(/[^0-9.]/g, '')) - parseFloat(b.price.replace(/[^0-9.]/g, '')));
    } else if (sortOption === "price-high") {
      sortedProducts.sort((a, b) => parseFloat(b.price.replace(/[^0-9.]/g, '')) - parseFloat(a.price.replace(/[^0-9.]/g, '')));
    } else if (sortOption === "rating") {
      sortedProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    setFilteredProducts(sortedProducts);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setFilteredProducts(products.filter(product => 
      product.listing_title.toLowerCase().includes(query.toLowerCase()) ||
      product.vendor.username.toLowerCase().includes(query.toLowerCase())
    ));
  };

  if (isLoading) {
    return (
      <BuyerLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading listings...</p>
          </div>
        </div>
      </BuyerLayout>
    );
  }

  return (
    <BuyerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 text-white border border-gray-700">
          <h1 className="text-2xl font-bold mb-2">Browse Listings</h1>
          <p className="text-gray-300">Discover {filteredProducts.length} products from trusted vendors</p>
        </div>

        {/* Search, Sort, and View Toggle - All in One Line */}
        <div className="flex items-center gap-4">
          {/* Search Bar with Dark Background */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search products, vendors, or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Categories Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
                {categories.find(cat => cat.id === selectedCategory)?.name || "All Categories"}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {categories.map((category) => (
                <DropdownMenuItem
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center justify-between"
                >
                  <span>{category.name}</span>
                  <Badge variant="secondary" className="ml-2">
                    {category.count}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
                Sort by: {sortBy === "newest" ? "Newest" : 
                         sortBy === "oldest" ? "Oldest" :
                         sortBy === "price-low" ? "Price: Low to High" :
                         sortBy === "price-high" ? "Price: High to Low" :
                         sortBy === "rating" ? "Highest Rated" :
                         sortBy === "popular" ? "Most Popular" : "Newest"}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy("newest")}>Newest First</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("oldest")}>Oldest First</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("price-low")}>Price: Low to High</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("price-high")}>Price: High to Low</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("rating")}>Highest Rated</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("popular")}>Most Popular</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Mode Toggle */}
          <div className="flex border border-gray-600 rounded-lg overflow-hidden bg-gray-800">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={`rounded-r-none ${viewMode === "grid" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={`rounded-l-none ${viewMode === "list" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
            >
              <ListIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-400">
          Showing {filteredProducts.length} of {products.length} products
        </div>

        {/* Main Content with Categories on Left and Products on Right */}
        <div className="flex gap-6">
          {/* Left Sidebar - Categories */}
          <div className="w-64 flex-shrink-0">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{category.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {category.count}
                      </Badge>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Products Grid/List */}
          <div className="flex-1">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg mb-2">No products found</div>
                <p className="text-gray-500">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className={viewMode === "grid" ? 
                "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : 
                "space-y-4"
              }>
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} viewMode={viewMode} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}