
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Search, Filter, Eye, MessageSquare, Clock, User, Ticket as TicketIcon, Plus, Loader2, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import ticketService from "@/services/ticketService";
import { TicketDetailModal } from "@/components/tickets/TicketDetailModal";

export default function AdminTickets() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    priority: 'all',
    assigned: 'all'
  });
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [ticketToAssign, setTicketToAssign] = useState<string | null>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    description: ''
  });

  useEffect(() => {
    fetchTickets();
    fetchStatistics();
  }, [filters]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params: any = {};

      if (filters.search) params.search = filters.search;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.priority !== 'all') params.priority = filters.priority;
      if (filters.assigned !== 'all') params.assigned_to = filters.assigned;

      const response = await ticketService.getTickets(params);
      if (response.success) {
        setTickets(response.data || []);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to fetch tickets",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tickets",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await ticketService.getTicketStatistics();
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject || !newTicket.description || !newTicket.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreatingTicket(true);
      const response = await ticketService.createTicket(newTicket);
      if (response.success) {
        toast({
          title: "Success",
          description: "Ticket created successfully"
        });
        setNewTicket({ subject: '', category: '', priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent', description: '' });
        fetchTickets();
        fetchStatistics();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to create ticket",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to create ticket",
        variant: "destructive"
      });
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: string) => {
    try {
      const response = await ticketService.updateTicketStatus(ticketId, status);
      if (response.success) {
        toast({
          title: "Success",
          description: "Ticket status updated successfully"
        });
        fetchTickets();
        fetchStatistics();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to update ticket status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive"
      });
    }
  };

  const handleAssignTicketClick = (ticketId: string) => {
    setTicketToAssign(ticketId);
    setIsAssignModalOpen(true);
    fetchAdminUsers();
  };

  const fetchAdminUsers = async () => {
    try {
      setLoadingAdmins(true);
      const response = await ticketService.getAdminUsers();
      if (response.success && response.data) {
        setAdminUsers(response.data);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to fetch admin users",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching admin users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch admin users",
        variant: "destructive"
      });
    } finally {
      setLoadingAdmins(false);
    }
  };

  const handleAssignTicket = async () => {
    if (!ticketToAssign || !selectedAdminId) {
      toast({
        title: "Error",
        description: "Please select an admin user first",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsAssigning(true);
      const response = await ticketService.assignTicket(ticketToAssign, selectedAdminId);
      if (response.success) {
        toast({
          title: "Success",
          description: "Ticket assigned successfully"
        });
        setIsAssignModalOpen(false);
        setTicketToAssign(null);
        setSelectedAdminId(null);
        fetchTickets();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to assign ticket",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error assigning ticket:', error);
      toast({
        title: "Error",
        description: "Failed to assign ticket",
        variant: "destructive"
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    try {
      const response = await ticketService.closeTicket(ticketId);
      if (response.success) {
        toast({
          title: "Success",
          description: "Ticket closed successfully"
        });
        fetchTickets();
        fetchStatistics();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to close ticket",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error closing ticket:', error);
      toast({
        title: "Error",
        description: "Failed to close ticket",
        variant: "destructive"
      });
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'open': return 'Open';
      case 'in_progress': return 'In Progress';
      case 'waiting_response': return 'Waiting for Response';
      case 'resolved': return 'Resolved';
      case 'closed': return 'Closed';
      default: return status;
    }
  };

  const getPriorityDisplay = (priority: string) => {
    switch (priority) {
      case 'low': return 'Low';
      case 'medium': return 'Medium';
      case 'high': return 'High';
      case 'urgent': return 'Urgent';
      default: return priority;
    }
  };

  return (

    <main className="flex-1 overflow-y-auto bg-bg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
          <p className="text-gray-300 mt-1">Manage customer support requests and inquiries</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-accent text-bg hover:bg-accent-2">
              <Plus className="w-4 h-4 mr-2" />
              Create Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Subject</label>
                <Input
                  placeholder="Brief description of the issue"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
                  <Select value={newTicket.category} onValueChange={(value) => setNewTicket({ ...newTicket, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="account">Account</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="vendor_application">Vendor Application</SelectItem>
                      <SelectItem value="order_issue">Order Issue</SelectItem>
                      <SelectItem value="listing">Listing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Priority</label>
                  <Select value={newTicket.priority} onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => setNewTicket({ ...newTicket, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Description</label>
                <Textarea
                  placeholder="Describe the issue in detail..."
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  className="min-h-32"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button variant="outline">Cancel</Button>
                <Button onClick={handleCreateTicket} disabled={isCreatingTicket}>
                  {isCreatingTicket && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Ticket
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="crypto-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <TicketIcon className="w-8 h-8 text-danger mr-4" />
              <div>
                <p className="text-sm text-gray-400">Open Tickets</p>
                <p className="text-2xl font-bold text-white">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (statistics?.open_tickets || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="crypto-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-warning mr-4" />
              <div>
                <p className="text-sm text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-white">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (statistics?.in_progress_tickets || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="crypto-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center mr-4">
                <TicketIcon className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Resolved</p>
                <p className="text-2xl font-bold text-white">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (statistics?.resolved_tickets || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="crypto-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="w-8 h-8 text-accent mr-4" />
              <div
              >
                <p className="text-sm text-gray-400">Avg Response Time</p>
                <p className="text-2xl font-bold text-white">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : `${statistics?.avg_response_time || 0}h`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="crypto-card mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search tickets by ID, user, or subject..."
                  className="pl-10 border-border text-white"
                  data-testid="search-tickets"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
            </div>
            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting_response">Waiting Response</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.priority} onValueChange={(value) => setFilters({ ...filters, priority: value })}>
              <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.assigned} onValueChange={(value) => setFilters({ ...filters, assigned: value })}>
              <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                <SelectValue placeholder="Assigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card className="crypto-card">
        <CardHeader>
          <CardTitle className="text-white">Support Tickets</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-2">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-gray-300">Ticket ID</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-300">User</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-300">Subject</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-300">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-300">Priority</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-300">Assigned To</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-300">Created</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                      <p className="text-gray-400">Loading tickets...</p>
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center">
                      <p className="text-gray-400">No tickets found</p>
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-surface-2/50" data-testid={`ticket-row-${ticket.id}`}>
                      <td className="p-4">
                        <span className="font-mono text-accent">{ticket.ticket_id}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center mr-3">
                            <span className="text-accent text-sm">{ticket.user_username?.[0]?.toUpperCase() || 'U'}</span>
                          </div>
                          <div>
                            <span className="text-white">{ticket.user_username || 'Unknown User'}</span>
                            <p className="text-xs text-gray-400">{ticket.user_type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="max-w-xs">
                          <p className="text-white truncate">{ticket.subject}</p>
                          <p className="text-xs text-gray-400 truncate">{ticket.category}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            ticket.status === "open" ? "secondary" :
                              ticket.status === "in_progress" ? "default" :
                                ticket.status === "waiting_response" ? "destructive" :
                                  ticket.status === "resolved" ? "outline" :
                                    "secondary"
                          }
                          className="text-xs whitespace-nowrap"
                        >
                          {getStatusDisplay(ticket.status)}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            ticket.priority === "urgent" ? "destructive" :
                              ticket.priority === "high" ? "destructive" :
                                ticket.priority === "medium" ? "secondary" :
                                  "outline"
                          }
                          className="text-xs whitespace-nowrap"
                        >
                          {getPriorityDisplay(ticket.priority)}
                        </Badge>
                      </td>
                      <td className="p-4 text-gray-300">
                        {ticket.assigned_to_username || 'Unassigned'}
                      </td>
                      <td className="p-4 text-gray-300">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                            onClick={() => {
                              setSelectedTicketId(ticket.id);
                              setIsTicketModalOpen(true);
                            }}
                            data-testid={`view-ticket-${ticket.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                            onClick={() => {
                              setSelectedTicketId(ticket.id);
                              setIsTicketModalOpen(true);
                            }}
                            data-testid={`reply-ticket-${ticket.id}`}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          {ticket.status === "open" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-accent hover:text-blue-400"
                              onClick={() => handleAssignTicketClick(ticket.id)}
                              data-testid={`assign-ticket-${ticket.id}`}
                            >
                              Assign
                            </Button>
                          )}
                          {ticket.status !== "closed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-success hover:text-green-400"
                              onClick={() => handleCloseTicket(ticket.id)}
                              data-testid={`close-ticket-${ticket.id}`}
                            >
                              Close
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Reply Templates */}
      <Card className="crypto-card mt-6">
        <CardHeader>
          <CardTitle className="text-white">Quick Reply Templates</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-surface-2 rounded-lg">
              <h4 className="text-white font-medium mb-2">Account Recovery</h4>
              <p className="text-sm text-gray-400 mb-3">Thank you for contacting support. To help you recover your account, please provide your recovery phrase...</p>
              <Button
                variant="outline"
                size="sm"
                className="border-border text-gray-300 hover:bg-surface"
                data-testid="use-template-recovery"
                onClick={() => {
                  const template = "Thank you for contacting support. To help you recover your account, please provide your recovery phrase and we'll assist you immediately.";
                  setSelectedTemplate(template);
                  if (selectedTicketId) {
                    setIsTicketModalOpen(true);
                  } else {
                    toast({
                      title: "Select a ticket",
                      description: "Please click on a ticket first, then use the template",
                      variant: "destructive"
                    });
                  }
                }}
              >
                Use Template
              </Button>
            </div>

            <div className="p-4 bg-surface-2 rounded-lg">
              <h4 className="text-white font-medium mb-2">Order Issue</h4>
              <p className="text-sm text-gray-400 mb-3">We apologize for the issue with your order. Please provide your order ID and we'll investigate immediately...</p>
              <Button
                variant="outline"
                size="sm"
                className="border-border text-gray-300 hover:bg-surface"
                data-testid="use-template-order"
                onClick={() => {
                  const template = "We apologize for the issue with your order. Please provide your order ID and we'll investigate immediately. We'll get back to you within 24 hours.";
                  setSelectedTemplate(template);
                  if (selectedTicketId) {
                    setIsTicketModalOpen(true);
                  } else {
                    toast({
                      title: "Select a ticket",
                      description: "Please click on a ticket first, then use the template",
                      variant: "destructive"
                    });
                  }
                }}
              >
                Use Template
              </Button>
            </div>

            <div className="p-4 bg-surface-2 rounded-lg">
              <h4 className="text-white font-medium mb-2">General Inquiry</h4>
              <p className="text-sm text-gray-400 mb-3">Thank you for reaching out. We've received your inquiry and will respond within 24 hours...</p>
              <Button
                variant="outline"
                size="sm"
                className="border-border text-gray-300 hover:bg-surface"
                data-testid="use-template-general"
                onClick={() => {
                  const template = "Thank you for reaching out. We've received your inquiry and will respond within 24 hours. If this is urgent, please mark it as high priority.";
                  setSelectedTemplate(template);
                  if (selectedTicketId) {
                    setIsTicketModalOpen(true);
                  } else {
                    toast({
                      title: "Select a ticket",
                      description: "Please click on a ticket first, then use the template",
                      variant: "destructive"
                    });
                  }
                }}
              >
                Use Template
              </Button>
            </div>

            <div className="p-4 bg-surface-2 rounded-lg">
              <h4 className="text-white font-medium mb-2">Vendor Application</h4>
              <p className="text-sm text-gray-400 mb-3">Thank you for your vendor application. We'll review your submission and respond within 3-5 business days...</p>
              <Button
                variant="outline"
                size="sm"
                className="border-border text-gray-300 hover:bg-surface"
                data-testid="use-template-vendor"
                onClick={() => {
                  const template = "Thank you for your vendor application. We'll review your submission and respond within 3-5 business days. You'll receive an email notification once the review is complete.";
                  setSelectedTemplate(template);
                  if (selectedTicketId) {
                    setIsTicketModalOpen(true);
                  } else {
                    toast({
                      title: "Select a ticket",
                      description: "Please click on a ticket first, then use the template",
                      variant: "destructive"
                    });
                  }
                }}
              >
                Use Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        isOpen={isTicketModalOpen}
        onClose={() => {
          setIsTicketModalOpen(false);
          setSelectedTemplate(null);
        }}
        ticketId={selectedTicketId}
        isAdmin={true}
        templateText={selectedTemplate || undefined}
        onTicketUpdated={() => {
          fetchTickets();
          fetchStatistics();
        }}
      />

      {/* Assign Ticket Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-md bg-card text-white border border-gray-600/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Assign Ticket
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Select an admin user to assign this ticket to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {loadingAdmins ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
                <span className="ml-3 text-gray-400">Loading admin users...</span>
              </div>
            ) : adminUsers.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No admin users available</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                {adminUsers.map((admin) => (
                  <div
                    key={admin.id}
                    onClick={() => setSelectedAdminId(admin.id)}
                    className={`w-full p-3 rounded-lg border cursor-pointer transition-colors ${selectedAdminId === admin.id
                        ? 'border-accent bg-accent/10 text-white'
                        : 'border-border text-white hover:bg-surface-2/50'
                      }`}
                  >
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{admin.username}</span>
                      {selectedAdminId === admin.id && (
                        <Check className="w-4 h-4 ml-auto text-accent flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-600/30">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setTicketToAssign(null);
                  setSelectedAdminId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignTicket}
                disabled={!selectedAdminId || isAssigning}
                className="bg-accent text-bg hover:bg-accent-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  "Assign"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>

  );
}
