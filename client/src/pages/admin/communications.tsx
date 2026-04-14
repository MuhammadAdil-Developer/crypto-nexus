import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Megaphone, MessageSquare, Send, Plus, Trash2, Edit, Users, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/authService"; // Assuming api is exported from here or create a new service
import { format } from "date-fns";

// Types
interface Announcement {
    id: string;
    title: string;
    content: string;
    audience: 'all' | 'buyer' | 'vendor' | 'admin';
    priority: 'high' | 'normal' | 'low';
    is_active: boolean;
    start_date: string;
    end_date: string | null;
    created_at: string;
    created_by_username?: string;
}

export default function AdminCommunications() {
    const [activeTab, setActiveTab] = useState("announcements");
    const { toast } = useToast();

    // Announcement States
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentAnnouncementId, setCurrentAnnouncementId] = useState<string | null>(null);
    const [newAnnouncement, setNewAnnouncement] = useState({
        title: "",
        content: "",
        audience: "all",
        priority: "normal",
        duration: "7", // days
    });

    // Delete Confirmation State
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);

    // Bulk Notification States
    const [bulkNotification, setBulkNotification] = useState({
        title: "",
        message: "",
        target_group: "all",
        type: "system"
    });
    const [sendingBulk, setSendingBulk] = useState(false);

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            setLoadingAnnouncements(true);
            const response = await api.get('/system/announcements/');
            if (response.data) {
                // Handle potential pagination structure (results array) or direct array
                const data = response.data.results || response.data;
                setAnnouncements(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Error fetching announcements:", error);
            toast({
                title: "Error",
                description: "Failed to load announcements",
                variant: "destructive",
            });
        } finally {
            setLoadingAnnouncements(false);
        }
    };

    const handleCreateOrUpdateAnnouncement = async () => {
        try {
            // Calculate end date based on duration
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + parseInt(newAnnouncement.duration));

            const payload = {
                title: newAnnouncement.title,
                content: newAnnouncement.content,
                audience: newAnnouncement.audience,
                priority: newAnnouncement.priority,
                end_date: endDate.toISOString(),
            };

            if (isEditing && currentAnnouncementId) {
                await api.patch(`/system/announcements/${currentAnnouncementId}/`, payload);
                toast({
                    title: "Success",
                    description: "Announcement updated successfully",
                });
            } else {
                await api.post('/system/announcements/', payload);
                toast({
                    title: "Success",
                    description: "Announcement created successfully",
                });
            }

            setShowAnnouncementModal(false);
            resetForm();
            fetchAnnouncements();
        } catch (error) {
            console.error("Error saving announcement:", error);
            toast({
                title: "Error",
                description: `Failed to ${isEditing ? 'update' : 'create'} announcement`,
                variant: "destructive",
            });
        }
    };

    const resetForm = () => {
        setNewAnnouncement({
            title: "",
            content: "",
            audience: "all",
            priority: "normal",
            duration: "7",
        });
        setIsEditing(false);
        setCurrentAnnouncementId(null);
    };

    const handleEditClick = (announcement: Announcement) => {
        setNewAnnouncement({
            title: announcement.title,
            content: announcement.content,
            audience: announcement.audience,
            priority: announcement.priority,
            duration: "7", // Default, or calculate from dates if needed
        });
        setCurrentAnnouncementId(announcement.id);
        setIsEditing(true);
        setShowAnnouncementModal(true);
    };

    const confirmDelete = (id: string) => {
        setAnnouncementToDelete(id);
        setShowDeleteDialog(true);
    };

    const handleDeleteAnnouncement = async () => {
        if (!announcementToDelete) return;

        try {
            await api.delete(`/system/announcements/${announcementToDelete}/`);
            toast({
                title: "Success",
                description: "Announcement deleted",
            });
            fetchAnnouncements();
        } catch (error) {
            console.error("Error deleting announcement:", error);
            toast({
                title: "Error",
                description: "Failed to delete announcement",
                variant: "destructive",
            });
        } finally {
            setShowDeleteDialog(false);
            setAnnouncementToDelete(null);
        }
    };

    const handleSendBulkNotification = async () => {
        if (!bulkNotification.title || !bulkNotification.message) {
            toast({
                title: "Error",
                description: "Please fill in all fields",
                variant: "destructive",
            });
            return;
        }

        try {
            setSendingBulk(true);
            await api.post('/system/communications/send_bulk_notification/', bulkNotification);

            toast({
                title: "Success",
                description: "Bulk notifications sent successfully",
            });

            setBulkNotification({
                title: "",
                message: "",
                target_group: "all",
                type: "system"
            });
        } catch (error) {
            console.error("Error sending bulk notification:", error);
            toast({
                title: "Error",
                description: "Failed to send notifications",
                variant: "destructive",
            });
        } finally {
            setSendingBulk(false);
        }
    };

    return (
        <main className="flex-1 overflow-y-auto bg-bg p-6">
            <div className="space-y-6">
                {/* Header */}
                <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    <div className="flex items-center space-x-3">
                        <Megaphone className="w-8 h-8 text-blue-400" />
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Communications Center</h1>
                            <p className="text-gray-400 mt-2 text-sm sm:text-base">Manage announcements and mass messaging</p>
                        </div>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="bg-surface-2 border border-border">
                        <TabsTrigger value="announcements" className="data-[state=active]:bg-accent data-[state=active]:text-white">
                            <Megaphone className="w-4 h-4 mr-2" />
                            Announcements
                        </TabsTrigger>
                        <TabsTrigger value="bulk-messaging" className="data-[state=active]:bg-accent data-[state=active]:text-white">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Bulk Messaging
                        </TabsTrigger>
                    </TabsList>

                    {/* Announcements Tab */}
                    <TabsContent value="announcements" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-white">System Announcements</h2>
                            <Dialog open={showAnnouncementModal} onOpenChange={setShowAnnouncementModal}>
                                <DialogTrigger asChild>
                                    <Button className="bg-accent hover:bg-accent/90">
                                        <Plus className="w-4 h-4 mr-2" />
                                        New Announcement
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-surface-2 border-border text-white">
                                    <DialogHeader>
                                        <DialogTitle>{isEditing ? "Edit Announcement" : "Create New Announcement"}</DialogTitle>
                                        <DialogDescription>
                                            {isEditing ? "Update the details of this announcement." : "This announcement will be visible on user dashboards."}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Title</Label>
                                            <Input
                                                value={newAnnouncement.title}
                                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                                placeholder="e.g., Scheduled Maintenance"
                                                className="bg-gray-800 border-gray-600 text-white border-border"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Content</Label>
                                            <Textarea
                                                value={newAnnouncement.content}
                                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                                                placeholder="Detailed message..."
                                                className="bg-bg bg-gray-800 border-gray-600 text-white border-border min-h-[100px]"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Target Audience</Label>
                                                <Select
                                                    value={newAnnouncement.audience}
                                                    onValueChange={(val) => setNewAnnouncement({ ...newAnnouncement, audience: val })}
                                                >
                                                    <SelectTrigger className="bg-bg border-border">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="border-border text-white">
                                                        <SelectItem value="all">All Users</SelectItem>
                                                        <SelectItem value="buyer">Buyers Only</SelectItem>
                                                        <SelectItem value="vendor">Vendors Only</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Priority</Label>
                                                <Select
                                                    value={newAnnouncement.priority}
                                                    onValueChange={(val) => setNewAnnouncement({ ...newAnnouncement, priority: val })}
                                                >
                                                    <SelectTrigger className="bg-bg border-border">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="border-border text-white">
                                                        <SelectItem value="normal">Normal</SelectItem>
                                                        <SelectItem value="high">High (Red)</SelectItem>
                                                        <SelectItem value="low">Low (Gray)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Duration (Days)</Label>
                                            <Select
                                                value={newAnnouncement.duration}
                                                onValueChange={(val) => setNewAnnouncement({ ...newAnnouncement, duration: val })}
                                            >
                                                <SelectTrigger className="bg-bg border-border">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="border-border text-white">
                                                    <SelectItem value="1">1 Day</SelectItem>
                                                    <SelectItem value="3">3 Days</SelectItem>
                                                    <SelectItem value="7">1 Week</SelectItem>
                                                    <SelectItem value="30">1 Month</SelectItem>
                                                    <SelectItem value="365">1 Year</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button onClick={handleCreateOrUpdateAnnouncement} className="w-full bg-accent hover:bg-accent/90">
                                            {isEditing ? "Update Announcement" : "Publish Announcement"}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <Card className="border-border">
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-border hover:bg-transparent">
                                            <TableHead className="text-gray-400">Title</TableHead>
                                            <TableHead className="text-gray-400">Audience</TableHead>
                                            <TableHead className="text-gray-400">Priority</TableHead>
                                            <TableHead className="text-gray-400">Created At</TableHead>
                                            <TableHead className="text-gray-400 text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {announcements.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                                    No active announcements found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            announcements.map((announcement) => (
                                                <TableRow key={announcement.id} className="border-border hover:bg-surface-2">
                                                    <TableCell className="font-medium text-white">{announcement.title}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="text-xs">
                                                            {announcement.audience.toUpperCase()}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={`${announcement.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                                                                announcement.priority === 'low' ? 'bg-gray-500/10 text-gray-500' :
                                                                    'bg-blue-500/10 text-blue-500'
                                                                }`}
                                                        >
                                                            {announcement.priority}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-gray-400">
                                                        {format(new Date(announcement.created_at), 'MMM dd, yyyy')}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 mr-1"
                                                            onClick={() => handleEditClick(announcement)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                                            onClick={() => confirmDelete(announcement.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                            <AlertDialogContent className="bg-surface-2 border-border text-white">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-gray-400">
                                        This action cannot be undone. This will permanently delete the announcement
                                        and remove it from all user dashboards.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-transparent border-border text-white hover:bg-white/10 hover:text-white">Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDeleteAnnouncement}
                                        className="bg-red-600 hover:bg-red-700 text-white border-none"
                                    >
                                        Delete Announcement
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TabsContent>

                    {/* Bulk Messaging Tab */}
                    <TabsContent value="bulk-messaging">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card className="bg-surface-1 border-border lg:col-span-2">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Send className="w-5 h-5 text-accent" />
                                        Send Mass Notification
                                    </CardTitle>
                                    <CardDescription>
                                        Send a system notification to a specific group of users.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">Notification Title</Label>
                                        <Input
                                            value={bulkNotification.title}
                                            onChange={(e) => setBulkNotification({ ...bulkNotification, title: e.target.value })}
                                            placeholder="e.g., Platform Update 2.0"
                                            className="bg-gray-800 border-gray-600 text-white"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-gray-300">Target Group</Label>
                                            <Select
                                                value={bulkNotification.target_group}
                                                onValueChange={(val) => setBulkNotification({ ...bulkNotification, target_group: val })}
                                            >
                                                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="border-border text-white">
                                                    <SelectItem value="all">All Users (Buyers & Vendors)</SelectItem>
                                                    <SelectItem value="buyers">All Buyers</SelectItem>
                                                    <SelectItem value="vendors">All Vendors</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-gray-300">Notification Type</Label>
                                            <Select
                                                value={bulkNotification.type}
                                                onValueChange={(val) => setBulkNotification({ ...bulkNotification, type: val })}
                                            >
                                                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-surface-2 border-border text-white">
                                                    <SelectItem value="system">System Alert</SelectItem>
                                                    <SelectItem value="listing_approval">Important Update</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-gray-300">Message Content</Label>
                                        <Textarea
                                            value={bulkNotification.message}
                                            onChange={(e) => setBulkNotification({ ...bulkNotification, message: e.target.value })}
                                            placeholder="Enter the message meant for the users..."
                                            className="bg-gray-800 border-gray-600 text-white min-h-[150px]"
                                        />
                                    </div>

                                    <div className="pt-4 flex justify-end">
                                        <Button
                                            onClick={handleSendBulkNotification}
                                            disabled={sendingBulk}
                                            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]"
                                        >
                                            {sendingBulk ? "Sending..." : "Send Notifications"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="space-y-6">
                                <Card className="bg-surface-1 border-border">
                                    <CardHeader>
                                        <CardTitle className="text-white text-lg">Tips & Guidelines</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 text-sm text-gray-400">
                                        <p>
                                            <strong className="text-white">Announcements:</strong> Use these for persistent updates that should stay visible on the dashboard for a period of time (e.g., Maintenance warnings, New Feature highlights).
                                        </p>
                                        <p>
                                            <strong className="text-white">Bulk Messaging:</strong> Use this for one-time alerts that appear in the notification dropdown. Good for immediate alerts that don't need to persist permanently.
                                        </p>
                                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3 text-yellow-200">
                                            <Bell className="w-4 h-4 inline mr-2" />
                                            Notifications are delivered instantly and cannot be undone. double check your message before sending!
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </main>
    );
}
