import { useState } from "react";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Eye, Search, Filter, MoreVertical } from "lucide-react";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const products = [
  {
    id: 1,
    name: "Netflix Premium Account (1 Year)",
    category: "Streaming Accounts",
    price: "0.0012 BTC",
    stock: 23,
    sales: 45,
    status: "Active",
    image: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=100",
    created: "2024-01-10"
  },
  {
    id: 2,
    name: "Spotify Premium (6 Months)",
    category: "Streaming Accounts",
    price: "0.0008 BTC",
    stock: 18,
    sales: 32,
    status: "Active",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100",
    created: "2024-01-08"
  },
  {
    id: 3,
    name: "Adobe Creative Cloud (1 Year)",
    category: "Digital Goods",
    price: "0.0034 BTC",
    stock: 8,
    sales: 15,
    status: "Active",
    image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=100",
    created: "2024-01-05"
  },
  {
    id: 4,
    name: "Discord Nitro (3 Months)",
    category: "Gaming Accounts",
    price: "0.0005 BTC",
    stock: 0,
    sales: 8,
    status: "Out of Stock",
    image: "https://images.unsplash.com/photo-1611532736797-de8892681dfd?w=100",
    created: "2024-01-03"
  },
  {
    id: 5,
    name: "VPN Service (1 Year)",
    category: "VPN & Security",
    price: "0.0015 BTC",
    stock: 12,
    sales: 22,
    status: "Under Review",
    image: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=100",
    created: "2024-01-01"
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800 border-green-200";
    case "Out of Stock":
      return "bg-red-100 text-red-800 border-red-200";
    case "Under Review":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-gray-700 text-gray-800 border-gray-700 bg-gray-900";
  }
};

export default function VendorListings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || product.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Product Listings</h1>
            <p className="text-gray-400">Manage your products and inventory</p>
          </div>
          <Link href="/vendor/listings/add">
            <Button className="bg-blue-500 hover:bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Add New Product
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-white">24</div>
              <p className="text-sm text-gray-400">Total Products</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">19</div>
              <p className="text-sm text-gray-400">Active Listings</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-red-600">3</div>
              <p className="text-sm text-gray-400">Out of Stock</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-yellow-600">2</div>
              <p className="text-sm text-gray-400">Under Review</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                  <SelectItem value="Under Review">Under Review</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Streaming Accounts">Streaming Accounts</SelectItem>
                  <SelectItem value="Digital Goods">Digital Goods</SelectItem>
                  <SelectItem value="Gaming Accounts">Gaming Accounts</SelectItem>
                  <SelectItem value="VPN & Security">VPN & Security</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">
              Products ({filteredProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                  <div className="flex items-center space-x-4">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{product.name}</h3>
                      <p className="text-sm text-gray-400">{product.category}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-400">Created: {product.created}</span>
                        <span className="text-sm text-gray-400">Sales: {product.sales}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="font-semibold text-blue-600">{product.price}</div>
                      <div className="text-sm text-gray-400">Stock: {product.stock}</div>
                    </div>

                    <Badge className={`border ${getStatusColor(product.status)}`}>
                      {product.status}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Product
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Plus className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Filter className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No products found</h3>
                <p className="text-gray-400">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </VendorLayout>
  );
}