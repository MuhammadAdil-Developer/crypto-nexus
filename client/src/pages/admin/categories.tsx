import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Folder, Tag, Move3D, GripVertical } from "lucide-react";

export default function AdminCategories() {
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Categories" }
  ];

  const categories = [
    {
      id: 1,
      name: "Streaming Services",
      slug: "streaming-services",
      description: "Digital entertainment and media streaming accounts",
      parentId: null,
      listingCount: 1247,
      isActive: true,
      order: 1,
      subcategories: [
        { id: 11, name: "Netflix", slug: "netflix", listingCount: 345 },
        { id: 12, name: "Spotify", slug: "spotify", listingCount: 234 },
        { id: 13, name: "Disney+", slug: "disney-plus", listingCount: 189 },
        { id: 14, name: "Amazon Prime", slug: "amazon-prime", listingCount: 156 }
      ]
    },
    {
      id: 2,
      name: "Software & Tools",
      slug: "software-tools",
      description: "Software licenses, applications, and digital tools",
      parentId: null,
      listingCount: 892,
      isActive: true,
      order: 2,
      subcategories: [
        { id: 21, name: "Adobe Creative Suite", slug: "adobe-creative", listingCount: 123 },
        { id: 22, name: "Microsoft Office", slug: "microsoft-office", listingCount: 234 },
        { id: 23, name: "Development Tools", slug: "dev-tools", listingCount: 156 },
        { id: 24, name: "Antivirus Software", slug: "antivirus", listingCount: 89 }
      ]
    },
    {
      id: 3,
      name: "Gaming",
      slug: "gaming",
      description: "Game accounts, in-game items, and gaming services",
      parentId: null,
      listingCount: 567,
      isActive: true,
      order: 3,
      subcategories: [
        { id: 31, name: "Steam Accounts", slug: "steam", listingCount: 234 },
        { id: 32, name: "Xbox Game Pass", slug: "xbox-gamepass", listingCount: 123 },
        { id: 33, name: "PlayStation Plus", slug: "ps-plus", listingCount: 109 },
        { id: 34, name: "Epic Games", slug: "epic-games", listingCount: 67 }
      ]
    },
    {
      id: 4,
      name: "Digital Services",
      slug: "digital-services",
      description: "VPNs, hosting, email services, and other digital solutions",
      parentId: null,
      listingCount: 423,
      isActive: true,
      order: 4,
      subcategories: [
        { id: 41, name: "VPN Services", slug: "vpn", listingCount: 145 },
        { id: 42, name: "Web Hosting", slug: "hosting", listingCount: 89 },
        { id: 43, name: "Email Services", slug: "email", listingCount: 67 },
        { id: 44, name: "Cloud Storage", slug: "cloud-storage", listingCount: 56 }
      ]
    }
  ];

  const tags = [
    { id: 1, name: "instant-delivery", count: 456, color: "success" },
    { id: 2, name: "warranty", count: 234, color: "accent" },
    { id: 3, name: "premium", count: 345, color: "warning" },
    { id: 4, name: "lifetime", count: 123, color: "danger" },
    { id: 5, name: "verified", count: 567, color: "success" },
    { id: 6, name: "bulk-discount", count: 89, color: "accent" }
  ];

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Category Management</h1>
            <p className="text-gray-300 mt-1">Organize marketplace products and manage categories</p>
          </div>
          <Button className="bg-accent text-bg hover:bg-accent-2">
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Folder className="w-8 h-8 text-accent mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Total Categories</p>
                  <p className="text-2xl font-bold text-white">{categories.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center mr-4">
                  <Folder className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Subcategories</p>
                  <p className="text-2xl font-bold text-white">16</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Tag className="w-8 h-8 text-warning mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Active Tags</p>
                  <p className="text-2xl font-bold text-white">{tags.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-danger/20 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-danger font-bold">#</span>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Listings</p>
                  <p className="text-2xl font-bold text-white">3,129</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="bg-surface-2 mb-6">
            <TabsTrigger value="categories" className="text-gray-300 data-[state=active]:text-white">
              Categories
            </TabsTrigger>
            <TabsTrigger value="create" className="text-gray-300 data-[state=active]:text-white">
              Create Category
            </TabsTrigger>
            <TabsTrigger value="tags" className="text-gray-300 data-[state=active]:text-white">
              Tags
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories">
            <Card className="crypto-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Category Hierarchy</CardTitle>
                  <Button variant="outline" className="border-border text-gray-300 hover:bg-surface-2">
                    <Move3D className="w-4 h-4 mr-2" />
                    Reorder
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {categories.map((category) => (
                    <div key={category.id} className="border border-border rounded-lg p-4" data-testid={`category-${category.id}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <GripVertical className="w-5 h-5 text-gray-400 mr-3 cursor-move" />
                          <div>
                            <h3 className="text-lg font-medium text-white">{category.name}</h3>
                            <p className="text-sm text-gray-400">{category.description}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-sm text-gray-400">Slug: {category.slug}</span>
                              <span className="text-sm text-accent">{category.listingCount} listings</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`edit-category-${category.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-danger hover:text-red-400" data-testid={`delete-category-${category.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {category.subcategories && category.subcategories.length > 0 && (
                        <div className="ml-8 space-y-2">
                          <h4 className="text-sm font-medium text-gray-300">Subcategories:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {category.subcategories.map((sub) => (
                              <div key={sub.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg" data-testid={`subcategory-${sub.id}`}>
                                <div>
                                  <p className="text-white">{sub.name}</p>
                                  <p className="text-xs text-gray-400">{sub.listingCount} listings</p>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-6 w-6 p-0" data-testid={`edit-subcategory-${sub.id}`}>
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-danger hover:text-red-400 h-6 w-6 p-0" data-testid={`delete-subcategory-${sub.id}`}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                          <Button variant="outline" size="sm" className="border-border text-gray-300 hover:bg-surface-2" data-testid={`add-subcategory-${category.id}`}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Subcategory
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Category Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="categoryName" className="text-white">Category Name</Label>
                      <Input 
                        id="categoryName"
                        placeholder="Enter category name..."
                        className="mt-2 bg-surface-2 border-border text-white"
                        data-testid="category-name-input"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="categorySlug" className="text-white">URL Slug</Label>
                      <Input 
                        id="categorySlug"
                        placeholder="category-slug"
                        className="mt-2 bg-surface-2 border-border text-white"
                        data-testid="category-slug-input"
                      />
                      <p className="text-sm text-gray-400 mt-1">Auto-generated from name</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="categoryDescription" className="text-white">Description</Label>
                      <Textarea 
                        id="categoryDescription"
                        placeholder="Describe this category..."
                        className="mt-2 bg-surface-2 border-border text-white"
                        rows={4}
                        data-testid="category-description-input"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="parentCategory" className="text-white">Parent Category</Label>
                      <select 
                        id="parentCategory"
                        className="mt-2 w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-white"
                        data-testid="parent-category-select"
                      >
                        <option value="">None (Top Level)</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Category Settings</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="displayOrder" className="text-white">Display Order</Label>
                      <Input 
                        id="displayOrder"
                        type="number"
                        defaultValue="0"
                        className="mt-2 bg-surface-2 border-border text-white"
                        data-testid="display-order-input"
                      />
                      <p className="text-sm text-gray-400 mt-1">Lower numbers appear first</p>
                    </div>
                    
                    <div>
                      <Label className="text-white">Category Status</Label>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center space-x-2">
                          <input type="radio" id="active" name="status" value="active" defaultChecked className="text-accent" />
                          <Label htmlFor="active" className="text-gray-300">Active</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="radio" id="hidden" name="status" value="hidden" className="text-accent" />
                          <Label htmlFor="hidden" className="text-gray-300">Hidden</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="radio" id="disabled" name="status" value="disabled" className="text-accent" />
                          <Label htmlFor="disabled" className="text-gray-300">Disabled</Label>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-white">Category Icon</Label>
                      <div className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center">
                        <p className="text-gray-400">Upload category icon (optional)</p>
                        <Button variant="outline" className="mt-2 border-border text-gray-300" data-testid="upload-category-icon">
                          Choose File
                        </Button>
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <Button className="w-full bg-accent text-bg hover:bg-accent-2" data-testid="create-category-button">
                        Create Category
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tags">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Manage Tags</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex space-x-2">
                      <Input 
                        placeholder="Add new tag..."
                        className="bg-surface-2 border-border text-white"
                        data-testid="new-tag-input"
                      />
                      <Button className="bg-accent text-bg hover:bg-accent-2" data-testid="add-tag-button">
                        Add
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <div key={tag.id} className="flex items-center space-x-2 group" data-testid={`tag-${tag.id}`}>
                          <Badge 
                            variant={tag.color === "success" ? "default" : tag.color === "danger" ? "destructive" : "secondary"}
                            className="pr-1"
                          >
                            {tag.name}
                            <span className="ml-2 text-xs opacity-75">({tag.count})</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="ml-1 h-auto p-0 w-4 h-4 opacity-0 group-hover:opacity-100 hover:bg-transparent"
                              data-testid={`delete-tag-${tag.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Tag Analytics</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-white">Most Popular Tags</h4>
                    <div className="space-y-3">
                      {tags.sort((a, b) => b.count - a.count).slice(0, 5).map((tag, index) => (
                        <div key={tag.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                          <div className="flex items-center">
                            <span className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center text-accent text-sm font-bold mr-3">
                              {index + 1}
                            </span>
                            <span className="text-white">{tag.name}</span>
                          </div>
                          <span className="text-accent font-mono">{tag.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </AdminLayout>
  );
}