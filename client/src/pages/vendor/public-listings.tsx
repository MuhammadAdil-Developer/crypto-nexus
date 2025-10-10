import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/buyer/ProductCard';
import { productService, Product } from '@/services/productService';
import { Loader2, Package, AlertCircle } from 'lucide-react';
import { CartProvider } from '@/contexts/CartContext';

function VendorPublicListingsContent() {
  const { vendorUsername } = useParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!vendorUsername) {
        setLoading(false);
        return;
      }
      
      try {
        setError(null);
        console.log('🔍 Fetching products for vendor:', vendorUsername);
        const res = await productService.getVendorPublicProducts(vendorUsername);
        console.log('🔍 API Response:', res);
        
        if (res.success && res.data) {
          setProducts(res.data);
          console.log('🔍 Products loaded:', res.data.length);
        } else {
          console.log('🔍 No products found or API error:', res.message);
          setProducts([]);
          setError(res.message || 'Failed to load products');
        }
      } catch (error: any) {
        console.error('❌ Error fetching vendor products:', error);
        setProducts([]);
        setError(error.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [vendorUsername]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading vendor listings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-500 mb-2">Error Loading Products</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <Link to="/buyer/listings">
              <Button variant="outline" className="border-gray-600 text-gray-300">
                Back to listings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{vendorUsername}'s Listings</h1>
        <Link to="/buyer/listings">
          <Button variant="outline" className="border-gray-600 text-gray-300">Back to listings</Button>
        </Link>
      </div>
      
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Active Products ({products.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-400 text-lg">No active listings found</p>
              <p className="text-gray-500 text-sm">This vendor may not have any approved products yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product as any} viewMode="grid" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VendorPublicListings() {
  return (
    <CartProvider>
      <VendorPublicListingsContent />
    </CartProvider>
  );
}



