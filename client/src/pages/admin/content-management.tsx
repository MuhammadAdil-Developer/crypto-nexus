import { useState, useEffect } from "react";
import {
    FileText,
    Plus,
    Trash2,
    Edit2,
    Search,
    Loader2,
    ArrowUpDown,
    ExternalLink,
    Layout,
    MessageSquare,
    BookOpen,
    PlayCircle,
    Settings,
    MoreVertical,
    Check,
    X,
    AlertCircle,
    HelpCircle,
    Shield,
    Zap
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import contentService, { SupportResource, ForumCategory } from "@/services/contentService";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export default function ContentManagement() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [resources, setResources] = useState<SupportResource[]>([]);
    const [categories, setCategories] = useState<ForumCategory[]>([]);
    const [posts, setPosts] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("resources");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Resource Modal State
    const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
    const [editingResource, setEditingResource] = useState<SupportResource | null>(null);
    const [resourceForm, setResourceForm] = useState<Partial<SupportResource>>({
        title: "",
        description: "",
        icon: "FileText",
        link: "",
        link_text: "Read More",
        resource_type: "guide",
        order: 0
    });

    // Category Modal State
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ForumCategory | null>(null);
    const [categoryForm, setCategoryForm] = useState<Partial<ForumCategory>>({
        name: "",
        description: "",
        icon: "MessageSquare",
        order: 0
    });

    // Post Modal State
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<any | null>(null);
    const [postForm, setPostForm] = useState<any>({
        title: "",
        content: "",
        category: "",
        is_pinned: false,
        is_locked: false
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [resResult, catResult, postResult] = await Promise.all([
            contentService.getResources(),
            contentService.getCategories(),
            contentService.getPosts()
        ]);

        if (resResult.success) {
            const data = resResult.data;
            setResources(Array.isArray(data) ? data : (data.results || []));
        }
        if (catResult.success) {
            const data = catResult.data;
            setCategories(Array.isArray(data) ? data : (data.results || []));
        }
        if (postResult.success) {
            const data = postResult.data;
            setPosts(Array.isArray(data) ? data : (data.results || []));
        }
        setLoading(false);
    };

    const handleResourceSubmit = async () => {
        if (!resourceForm.title || !resourceForm.description) {
            toast({ title: "Error", description: "Title and description are required", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const action = editingResource
                ? contentService.updateResource(editingResource.id, resourceForm)
                : contentService.createResource(resourceForm);

            const result = await action;
            if (result.success) {
                toast({ title: "Success", description: `Resource ${editingResource ? 'updated' : 'created'} successfully` });
                setIsResourceModalOpen(false);
                fetchData();
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCategorySubmit = async () => {
        if (!categoryForm.name) {
            toast({ title: "Error", description: "Name is required", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const action = editingCategory
                ? contentService.updateCategory(editingCategory.id, categoryForm)
                : contentService.createCategory(categoryForm);

            const result = await action;
            if (result.success) {
                toast({ title: "Success", description: `Category ${editingCategory ? 'updated' : 'created'} successfully` });
                setIsCategoryModalOpen(false);
                fetchData();
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePostSubmit = async () => {
        if (!postForm.title || !postForm.content || !postForm.category) {
            toast({ title: "Error", description: "Title, content and category are required", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const action = editingPost
                ? contentService.updatePost(editingPost.id, postForm)
                : contentService.createPost(postForm);

            const result = await action;
            if (result.success) {
                toast({ title: "Success", description: `Post ${editingPost ? 'updated' : 'created'} successfully` });
                setIsPostModalOpen(false);
                fetchData();
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteResource = async (id: string) => {
        if (!confirm("Are you sure you want to delete this resource?")) return;
        const result = await contentService.deleteResource(id);
        if (result.success) {
            toast({ title: "Deleted", description: "Resource removed successfully" });
            fetchData();
        }
    };

    const deleteCategory = async (id: string) => {
        if (!confirm("Are you sure you want to delete this category?")) return;
        const result = await contentService.deleteCategory(id);
        if (result.success) {
            toast({ title: "Deleted", description: "Category removed successfully" });
            fetchData();
        }
    };

    const deletePost = async (id: string) => {
        if (!confirm("Are you sure you want to delete this post? This cannot be undone.")) return;
        const result = await contentService.deletePost(id);
        if (result.success) {
            toast({ title: "Deleted", description: "Forum post removed successfully" });
            fetchData();
        }
    };

    const getIconComponent = (iconName: string) => {
        switch (iconName) {
            case 'FileText': return <FileText className="w-5 h-5" />;
            case 'BookOpen': return <BookOpen className="w-5 h-5" />;
            case 'PlayCircle': return <PlayCircle className="w-5 h-5" />;
            case 'MessageSquare': return <MessageSquare className="w-5 h-5" />;
            case 'Settings': return <Settings className="w-5 h-5" />;
            case 'HelpCircle': return <HelpCircle className="w-5 h-5" />;
            case 'Shield': return <Shield className="w-5 h-5" />;
            case 'Zap': return <Zap className="w-5 h-5" />;
            default: return <FileText className="w-5 h-5" />;
        }
    };

    return (
        <div className="p-6 space-y-6 bg-bg min-h-screen text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Content Management</h1>
                    <p className="text-gray-400 mt-1">Manage static resources, guides, and forum categories</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        className="bg-accent text-bg font-bold hover:bg-accent/90"
                        onClick={() => {
                            if (activeTab === "resources") {
                                setEditingResource(null);
                                setResourceForm({ title: "", description: "", icon: "FileText", link: "", link_text: "Read More", resource_type: "guide", order: 0 });
                                setIsResourceModalOpen(true);
                            } else if (activeTab === "forum") {
                                setEditingCategory(null);
                                setCategoryForm({ name: "", description: "", icon: "MessageSquare", order: 0 });
                                setIsCategoryModalOpen(true);
                            } else {
                                setEditingPost(null);
                                setPostForm({ title: "", content: "", category: categories[0]?.id || "", is_pinned: false, is_locked: false });
                                setIsPostModalOpen(true);
                            }
                        }}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add {activeTab === "resources" ? "Resource" : activeTab === "forum" ? "Category" : "Forum Post"}
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="resources" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="bg-surface-1 border-border border p-1 rounded-xl mb-6">
                    <TabsTrigger value="resources" className="rounded-lg data-[state=active]:bg-accent data-[state=active]:text-bg px-6 py-2">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Resources & Guides
                    </TabsTrigger>
                    <TabsTrigger value="forum" className="rounded-lg data-[state=active]:bg-accent data-[state=active]:text-bg px-6 py-2">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Forum Categories
                    </TabsTrigger>
                    <TabsTrigger value="moderation" className="rounded-lg data-[state=active]:bg-accent data-[state=active]:text-bg px-6 py-2">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Forum Moderation
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="resources">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-surface-1 rounded-2xl border border-border">
                            <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
                            <p className="text-gray-400 animate-pulse">Fetching resources...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {resources.length === 0 && (
                                <div className="col-span-full py-12 text-center bg-surface-1 rounded-2xl border border-dashed border-border">
                                    <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold">No Resources Found</h3>
                                    <p className="text-gray-400">Start by adding your first support resource or guide</p>
                                </div>
                            ) || resources.map(resource => (
                                <Card key={resource.id} className="bg-surface-1 border-border hover:border-accent/40 transition-all overflow-hidden group">
                                    <CardHeader className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div className={`p-3 rounded-xl bg-opacity-10 mb-4 ${resource.resource_type === 'guide' ? 'bg-blue-500 text-blue-400' :
                                                resource.resource_type === 'tutorial' ? 'bg-purple-500 text-purple-400' :
                                                    resource.resource_type === 'forum' ? 'bg-green-500 text-green-400' : 'bg-gray-500 text-gray-400'
                                                }`}>
                                                {getIconComponent(resource.icon)}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => {
                                                    setEditingResource(resource);
                                                    setResourceForm(resource);
                                                    setIsResourceModalOpen(true);
                                                }}>
                                                    <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-accent" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => deleteResource(resource.id)}>
                                                    <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-danger" />
                                                </Button>
                                            </div>
                                        </div>
                                        <CardTitle className="text-xl">{resource.title}</CardTitle>
                                        <Badge variant="outline" className="mt-2 capitalize">{resource.resource_type}</Badge>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-0">
                                        <p className="text-gray-400 text-sm line-clamp-3 mb-4">{resource.description}</p>
                                        <div className="flex items-center justify-between text-xs text-gray-500 mt-auto">
                                            <span className="flex items-center">
                                                <ArrowUpDown className="w-3 h-3 mr-1" />
                                                Order: {resource.order}
                                            </span>
                                            <a href={resource.link} target="_blank" className="text-accent hover:underline flex items-center">
                                                {resource.link_text}
                                                <ExternalLink className="w-3 h-3 ml-1" />
                                            </a>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="forum">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-surface-1 rounded-2xl border border-border">
                            <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
                            <p className="text-gray-400 animate-pulse">Fetching categories...</p>
                        </div>
                    ) : (
                        <div className="bg-surface-1 border-border border rounded-2xl overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-bg-2/50 border-b border-border">
                                            <th className="p-4 font-semibold text-gray-400 text-sm">Icon</th>
                                            <th className="p-4 font-semibold text-gray-400 text-sm">Category Name</th>
                                            <th className="p-4 font-semibold text-gray-400 text-sm">Description</th>
                                            <th className="p-4 font-semibold text-gray-400 text-sm text-center">Posts</th>
                                            <th className="p-4 font-semibold text-gray-400 text-sm text-center">Order</th>
                                            <th className="p-4 font-semibold text-gray-400 text-sm text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categories.map(category => (
                                            <tr key={category.id} className="border-b border-border/40 hover:bg-white/5 transition-colors">
                                                <td className="p-4 font-medium">
                                                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                                                        {getIconComponent(category.icon)}
                                                    </div>
                                                </td>
                                                <td className="p-4 font-bold text-white">{category.name}</td>
                                                <td className="p-4 text-gray-400 text-sm italic pr-8">{category.description || "No description"}</td>
                                                <td className="p-4 text-center">
                                                    <Badge className="bg-accent/20 text-accent hover:bg-accent/30">{category.post_count} posts</Badge>
                                                </td>
                                                <td className="p-4 text-center font-mono text-gray-400">{category.order}</td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="outline" size="sm" onClick={() => {
                                                            setEditingCategory(category);
                                                            setCategoryForm(category);
                                                            setIsCategoryModalOpen(true);
                                                        }}>
                                                            <Edit2 className="w-4 h-4 mr-2" />
                                                            Edit
                                                        </Button>
                                                        <Button variant="outline" size="sm" className="border-danger/30 text-danger hover:bg-danger/10" onClick={() => deleteCategory(category.id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {categories.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-12 text-center text-gray-500 italic">No forum categories configured. Add one to start.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="moderation">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-surface-1 rounded-2xl border border-border">
                            <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
                            <p className="text-gray-400 animate-pulse">Fetching posts...</p>
                        </div>
                    ) : (
                        <div className="bg-surface-1 border-border border rounded-2xl overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-bg-2/50 border-b border-border">
                                            <th className="p-4 font-semibold text-gray-400 text-sm">Post Details</th>
                                            <th className="p-4 font-semibold text-gray-400 text-sm">Category</th>
                                            <th className="p-4 font-semibold text-gray-400 text-sm">Author</th>
                                            <th className="p-4 font-semibold text-gray-400 text-sm text-center">Status</th>
                                            <th className="p-4 font-semibold text-gray-400 text-sm">Date</th>
                                            <th className="p-4 font-semibold text-gray-400 text-sm text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {posts.map(post => (
                                            <tr key={post.id} className="border-b border-border/40 hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-bold text-white mb-1 group-hover:text-accent transition-colors cursor-pointer" onClick={() => {
                                                        setEditingPost(post);
                                                        setPostForm({ title: post.title, content: post.content, category: post.category, is_pinned: post.is_pinned, is_locked: post.is_locked });
                                                        setIsPostModalOpen(true);
                                                    }}>{post.title}</div>
                                                    <div className="text-xs text-gray-500 line-clamp-1">{post.content}</div>
                                                </td>
                                                <td className="p-4 text-sm text-gray-400">{post.category_name}</td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] text-accent font-bold">
                                                            {post.author_name?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-medium">{post.author_name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        {post.is_pinned && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Pinned</Badge>}
                                                        {post.is_locked && <Badge className="bg-danger/20 text-danger border-danger/30">Locked</Badge>}
                                                        {!post.is_pinned && !post.is_locked && <span className="text-gray-600 text-xs italic">Normal</span>}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-xs text-gray-500">
                                                    {new Date(post.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="sm" onClick={() => {
                                                            setEditingPost(post);
                                                            setPostForm({ title: post.title, content: post.content, category: post.category, is_pinned: post.is_pinned, is_locked: post.is_locked });
                                                            setIsPostModalOpen(true);
                                                        }}>
                                                            <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-accent" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10" onClick={() => deletePost(post.id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {posts.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-12 text-center text-gray-500 italic">No forum posts found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Resource Dialog */}
            <Dialog open={isResourceModalOpen} onOpenChange={setIsResourceModalOpen}>
                <DialogContent className="border-border text-white sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingResource ? 'Edit Resource' : 'Add New Resource'}</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Configure support guides, tutorials or links for buyers and vendors.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="title" className="text-right">Title</Label>
                            <Input id="title" value={resourceForm.title} onChange={e => setResourceForm({ ...resourceForm, title: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="desc" className="text-right">Description</Label>
                            <Textarea id="desc" value={resourceForm.description} onChange={e => setResourceForm({ ...resourceForm, description: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={resourceForm.resource_type} onValueChange={(v: any) => setResourceForm({ ...resourceForm, resource_type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="guide">Guide</SelectItem>
                                        <SelectItem value="tutorial">Tutorial</SelectItem>
                                        <SelectItem value="forum">Forum Link</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Icon</Label>
                                <Select value={resourceForm.icon} onValueChange={(v) => setResourceForm({ ...resourceForm, icon: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FileText">File Text</SelectItem>
                                        <SelectItem value="BookOpen">Book Open</SelectItem>
                                        <SelectItem value="PlayCircle">Video Play</SelectItem>
                                        <SelectItem value="MessageSquare">Forum Message</SelectItem>
                                        <SelectItem value="Settings">Settings</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="link" className="text-right">URL / Link</Label>
                            <Input id="link" value={resourceForm.link} onChange={e => setResourceForm({ ...resourceForm, link: e.target.value })} className="col-span-3" placeholder="https://..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Link Text</Label>
                                <Input value={resourceForm.link_text} onChange={e => setResourceForm({ ...resourceForm, link_text: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Display Order</Label>
                                <Input type="number" value={resourceForm.order} onChange={e => setResourceForm({ ...resourceForm, order: parseInt(e.target.value) })} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsResourceModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button onClick={handleResourceSubmit} className="bg-accent text-bg font-bold" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Resource
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Category Dialog */}
            <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
                <DialogContent className="border-border text-white sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? 'Edit Forum Category' : 'Add Forum Category'}</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Categories help organize community discussions.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="cat-name" className="text-right">Name</Label>
                            <Input id="cat-name" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="cat-desc" className="text-right">Description</Label>
                            <Textarea id="cat-desc" value={categoryForm.description} onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="space-y-2">
                            <Label>Icon</Label>
                            <Select value={categoryForm.icon} onValueChange={(v) => setCategoryForm({ ...categoryForm, icon: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MessageSquare">Default Message</SelectItem>
                                    <SelectItem value="HelpCircle">Help Circle</SelectItem>
                                    <SelectItem value="Shield">Security Shield</SelectItem>
                                    <SelectItem value="Zap">Zap Action</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Display Order</Label>
                            <Input type="number" value={categoryForm.order} onChange={e => setCategoryForm({ ...categoryForm, order: parseInt(e.target.value) })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button onClick={handleCategorySubmit} className="bg-accent text-bg font-bold" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Category
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Post Dialog */}
            <Dialog open={isPostModalOpen} onOpenChange={setIsPostModalOpen}>
                <DialogContent className="border-border text-white sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{editingPost ? 'Edit Forum Post' : 'Add Official Forum Post'}</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Create official announcements or moderated content for the community.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="post-title" className="text-right">Title</Label>
                            <Input id="post-title" value={postForm.title} onChange={e => setPostForm({ ...postForm, title: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="post-content" className="text-right mt-2">Content</Label>
                            <Textarea id="post-content" value={postForm.content} onChange={e => setPostForm({ ...postForm, content: e.target.value })} className="col-span-3 min-h-[200px]" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Category</Label>
                            <Select value={postForm.category} onValueChange={(v) => setPostForm({ ...postForm, category: v })}>
                                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select Category" /></SelectTrigger>
                                <SelectContent>
                                    {categories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-8 px-4 justify-center">
                            <div className="flex items-center space-x-2">
                                <Switch checked={postForm.is_pinned} onCheckedChange={(v) => setPostForm({ ...postForm, is_pinned: v })} id="pinned" />
                                <Label htmlFor="pinned" className="cursor-pointer">Pinned</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch checked={postForm.is_locked} onCheckedChange={(v) => setPostForm({ ...postForm, is_locked: v })} id="locked" />
                                <Label htmlFor="locked" className="cursor-pointer">Locked</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPostModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button onClick={handlePostSubmit} className="bg-accent text-bg font-bold" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Post
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
