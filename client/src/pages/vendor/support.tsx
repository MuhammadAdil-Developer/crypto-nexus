import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HelpCircle, Plus, Search, MoreVertical, MessageSquare, FileText, CheckCircle, Clock, AlertCircle, Loader2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from "@/hooks/use-toast";
import ticketService, { CreateTicketData } from "@/services/ticketService";
import { TicketDetailModal } from "@/components/tickets/TicketDetailModal";

const tickets = [
  {
    id: "TICK-2024-045",
    subject: "Payout Delay Issue",
    category: "Payments",
    priority: "High",
    status: "In Progress",
    description: "My Bitcoin payout scheduled for yesterday hasn't been processed yet. Can you please check the status?",
    created: "2024-01-15",
    lastUpdate: "2024-01-15",
    responses: 2
  },
  {
    id: "TICK-2024-044",
    subject: "Account Verification Help",
    category: "Account",
    priority: "Medium",
    status: "Waiting for Response",
    description: "I need help with completing my vendor verification. The document upload keeps failing.",
    created: "2024-01-14",
    lastUpdate: "2024-01-14",
    responses: 1
  },
  {
    id: "TICK-2024-043",
    subject: "Commission Rate Question",
    category: "General",
    priority: "Low",
    status: "Resolved",
    description: "I have a question about how commission rates are calculated for different product categories.",
    created: "2024-01-12",
    lastUpdate: "2024-01-13",
    responses: 3
  },
  {
    id: "TICK-2024-042",
    subject: "Product Listing Guidelines",
    category: "Listings",
    priority: "Medium",
    status: "Resolved",
    description: "Need clarification on the product listing guidelines for streaming accounts.",
    created: "2024-01-10",
    lastUpdate: "2024-01-11",
    responses: 2
  }
];

const faqData = [
  {
    category: "Payments & Payouts",
    questions: [
      {
        question: "How often are payouts processed?",
        answer: "Payouts are processed daily for Bitcoin and weekly for Monero. You can change your payout schedule in settings."
      },
      {
        question: "What are the minimum payout amounts?",
        answer: "Minimum payout is 0.001 BTC for Bitcoin and 0.1 XMR for Monero."
      },
      {
        question: "How are commission rates calculated?",
        answer: "Commission rates vary by category: 5% for streaming accounts, 7% for gaming accounts, and 3% for VPN services."
      }
    ]
  },
  {
    category: "Account & Verification",
    questions: [
      {
        question: "How long does vendor verification take?",
        answer: "Vendor verification typically takes 1-3 business days after submitting all required documents."
      },
      {
        question: "What documents are required for verification?",
        answer: "You need a valid ID, proof of business (if applicable), and verification of your crypto wallet addresses."
      }
    ]
  },
  {
    category: "Product Listings",
    questions: [
      {
        question: "How many products can I list?",
        answer: "There's no limit on the number of products you can list. However, ensure all listings comply with our guidelines."
      },
      {
        question: "Can I edit my listings after approval?",
        answer: "Yes, you can edit product details, pricing, and descriptions. Major changes may require re-approval."
      }
    ]
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Open":
      return "bg-theme-cyan/10 text-theme-cyan border-theme-cyan/20";
    case "In Progress":
      return "bg-theme-cyan/10 text-theme-cyan border-theme-cyan/20";
    case "Waiting for Response":
      return "bg-theme-red/10 text-theme-red border-theme-red/20";
    case "Resolved":
      return "bg-theme-cyan/10 text-theme-cyan border-theme-cyan/20";
    case "Closed":
      return "bg-gray-700 text-gray-400 border-gray-600";
    default:
      return "bg-gray-700 text-gray-400 border-gray-600";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "High":
    case "Urgent":
      return "bg-theme-red";
    case "Medium":
      return "bg-theme-cyan/70";
    case "Low":
      return "bg-theme-cyan";
    default:
      return "bg-gray-800";
  }
};

export default function VendorSupport() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [newTicket, setNewTicket] = useState<Omit<CreateTicketData, 'priority'> & { category: string; priority: 'low' | 'medium' | 'high' | 'urgent' }>({
    subject: "",
    category: "",
    priority: "medium",
    description: ""
  });

  // Close ticket confirmation dialog state
  const [closeTicketDialogOpen, setCloseTicketDialogOpen] = useState(false);
  const [ticketToClose, setTicketToClose] = useState<any>(null);
  const [isClosingTicket, setIsClosingTicket] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchStatistics();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await ticketService.getTickets();
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
      const ticketData: CreateTicketData = {
        subject: newTicket.subject,
        description: newTicket.description,
        category: newTicket.category,
        priority: newTicket.priority
      };
      const response = await ticketService.createTicket(ticketData);
      if (response.success) {
        toast({
          title: "Success",
          description: "Ticket created successfully"
        });
        setNewTicket({ subject: '', category: '', priority: 'medium', description: '' });
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

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticket_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalTickets = statistics?.total_tickets || 0;
  const openTickets = statistics?.open_tickets || 0;
  const waitingResponse = statistics?.waiting_response_tickets || 0;
  const resolvedTickets = statistics?.resolved_tickets || 0;

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

  const handleCloseTicket = async () => {
    if (!ticketToClose) return;

    try {
      setIsClosingTicket(true);
      const response = await ticketService.closeTicket(ticketToClose.id);

      if (response.success) {
        toast({
          title: "Success",
          description: "Ticket closed successfully"
        });
        await fetchTickets();
        await fetchStatistics();
        setCloseTicketDialogOpen(false);
        setTicketToClose(null);
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
    } finally {
      setIsClosingTicket(false);
    }
  };

  return (

    <div className="space-y-4 sm:space-y-6 lg:space-y-8 relative z-10 p-3 sm:p-0">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 mb-8">
        <div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter mb-2">
            Support & Help
          </h1>
          <p className="text-gray-400 font-medium max-w-lg italic text-sm sm:text-base">
            Get 24/7 assistance and manage your support tickets.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 rounded-xl h-12 px-6 font-bold transition-all transform hover:scale-105">
              <Plus className="w-5 h-5 mr-2" />
              Create Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md mx-4 sm:mx-auto bg-gray-900 border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Create Support Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Subject</label>
                <Input
                  placeholder="Brief description of your issue"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="bg-gray-800/50 border-gray-700 text-white rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 block">Category</label>
                  <Select value={newTicket.category} onValueChange={(value) => setNewTicket({ ...newTicket, category: value })}>
                    <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white rounded-lg">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-800 text-white">
                      <SelectItem value="account">Account</SelectItem>
                      <SelectItem value="payment">Payments</SelectItem>
                      <SelectItem value="listing">Listings</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="vendor_application">Application</SelectItem>
                      <SelectItem value="order_issue">Order Issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 block">Priority</label>
                  <Select value={newTicket.priority} onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => setNewTicket({ ...newTicket, priority: value })}>
                    <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-800 text-white">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Description</label>
                <Textarea
                  placeholder="Describe your issue in detail..."
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  className="min-h-32 bg-gray-800/50 border-gray-700 text-white rounded-lg"
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-2">
                <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-gray-800">Cancel</Button>
                <Button onClick={handleCreateTicket} disabled={isCreatingTicket} className="bg-cyan-600 hover:bg-cyan-500 text-white">
                  {isCreatingTicket && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Ticket
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Premium Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="border border-purple-500/20 bg-gray-900/40 backdrop-blur-sm relative overflow-hidden group hover:bg-gray-800/40 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 sm:p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <HelpCircle className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-purple-200/70">Total Tickets</p>
              <h3 className="text-2xl sm:text-3xl font-black text-white">{loading ? <Loader2 className="w-6 h-6 animate-spin" /> : totalTickets}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-cyan-500/20 bg-gray-900/40 backdrop-blur-sm relative overflow-hidden group hover:bg-gray-800/40 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 sm:p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-cyan-500/10 rounded-xl">
                <Clock className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-cyan-200/70">Open Tickets</p>
              <h3 className="text-2xl sm:text-3xl font-black text-white">{loading ? <Loader2 className="w-6 h-6 animate-spin" /> : openTickets}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-amber-500/20 bg-gray-900/40 backdrop-blur-sm relative overflow-hidden group hover:bg-gray-800/40 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 sm:p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <AlertCircle className="w-6 h-6 text-amber-500 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-200/70">Waiting Response</p>
              <h3 className="text-2xl sm:text-3xl font-black text-white">{loading ? <Loader2 className="w-6 h-6 animate-spin" /> : waitingResponse}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-500/20 bg-gray-900/40 backdrop-blur-sm relative overflow-hidden group hover:bg-gray-800/40 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-green-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 sm:p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <CheckCircle className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-emerald-200/70">Resolved</p>
              <h3 className="text-2xl sm:text-3xl font-black text-white">{loading ? <Loader2 className="w-6 h-6 animate-spin" /> : resolvedTickets}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Support Tickets */}
      <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-sm relative z-10 overflow-hidden shadow-2xl">
        <CardHeader className="p-4 sm:p-6 border-b border-gray-800/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl font-bold text-white">Support Tickets</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-cyan-400" />
                <Input
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64 bg-gray-900/50 border-gray-700/50 text-white rounded-xl focus:ring-cyan-500/20"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-gray-900/50 border-gray-700/50 text-white rounded-xl">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800 text-white">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="waiting_response">Waiting Response</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-cyan-500" />
                <p className="text-gray-400 font-medium">Loading tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700/50 border-dashed">
                <p className="text-gray-400 font-medium">No tickets found</p>
                <p className="text-sm text-gray-600 mt-2">Try adjusting your filters or create a new ticket.</p>
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <div key={ticket.id} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 lg:p-5 bg-gray-800/40 hover:bg-gray-700/40 border border-gray-700/30 rounded-xl transition-all group">
                  <div className="flex items-start space-x-4 min-w-0 flex-1">
                    <div className="flex flex-col items-center flex-shrink-0 pt-1">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(ticket.priority)} mb-1 shadow-lg`}></div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-bold text-white text-base truncate group-hover:text-cyan-400 transition-colors">{ticket.ticket_id}</h3>
                        <Badge className={`text-[10px] font-bold uppercase tracking-wider ${getStatusColor(getStatusDisplay(ticket.status))}`}>
                          {getStatusDisplay(ticket.status)}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-700 bg-gray-900/50">
                          {ticket.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-300 font-medium mb-1 break-words leading-relaxed">{ticket.subject}</p>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-1 sm:gap-0 text-xs text-gray-500 font-medium">
                        <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{ticket.response_count} responses</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 lg:pt-0 lg:border-l border-gray-700/50 lg:pl-6">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-800"
                      onClick={() => {
                        setSelectedTicketId(ticket.id);
                        setIsTicketModalOpen(true);
                      }}
                    >
                      <MessageSquare className="w-3 h-3 mr-2" />
                      View Ticket
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800 text-gray-200">
                        <DropdownMenuItem onClick={() => {
                          setSelectedTicketId(ticket.id);
                          setIsTicketModalOpen(true);
                        }}>
                          <FileText className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {ticket.status !== 'closed' && (
                          <DropdownMenuItem
                            onClick={() => {
                              setTicketToClose(ticket);
                              setCloseTicketDialogOpen(true);
                            }}
                            className="text-theme-red"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Close Ticket
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* FAQ and Contact Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FAQ Section */}
        <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-sm">
          <CardHeader className="p-4 sm:p-6 border-b border-gray-800/50">
            <CardTitle className="text-lg font-bold text-white flex items-center">
              <HelpCircle className="w-5 h-5 mr-2 text-cyan-400" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-6">
              {faqData.map((category, categoryIndex) => (
                <div key={categoryIndex}>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">{category.category}</h3>
                  <div className="space-y-3">
                    {category.questions.map((faq, faqIndex) => (
                      <div key={faqIndex} className="bg-gray-800/30 rounded-lg p-3 hover:bg-gray-800/50 transition-colors">
                        <h4 className="font-semibold text-gray-200 mb-1 text-sm">{faq.question}</h4>
                        <p className="text-gray-500 text-xs leading-relaxed">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-sm h-fit">
          <CardHeader className="p-4 sm:p-6 border-b border-gray-800/50">
            <CardTitle className="text-lg font-bold text-white flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-blue-400" />
              Contact Support
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center p-4 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/20 rounded-xl">
              <div className="p-3 bg-cyan-500/10 rounded-lg mr-4">
                <MessageSquare className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h4 className="font-bold text-white">Live Chat</h4>
                <p className="text-sm text-gray-400">Chat with our support team</p>
                <p className="text-xs text-cyan-400 font-medium mt-1">Available 24/7</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-gray-800/30 border border-gray-700/30 rounded-xl">
              <div className="p-3 bg-gray-700/30 rounded-lg mr-4">
                <FileText className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <h4 className="font-bold text-white">Email Support</h4>
                <p className="text-sm text-gray-400 break-all">vendor-support@cryptomarket.com</p>
                <p className="text-xs text-gray-500 font-medium mt-1">Response within 24h</p>
              </div>
            </div>

            <div className="p-4 bg-gray-800/30 border border-gray-700/30 rounded-xl">
              <div className="flex items-center mb-2">
                <HelpCircle className="w-5 h-5 text-gray-400 mr-2" />
                <h4 className="font-bold text-white">Help Center</h4>
              </div>
              <p className="text-sm text-gray-400 mb-3">Browse our detailed documentation for guides on listings, payouts, and security.</p>
              <Button variant="outline" size="sm" className="w-full border-gray-600 text-gray-300 hover:text-white">Visit Help Center</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        ticketId={selectedTicketId}
        isAdmin={false}
        onTicketUpdated={() => {
          fetchTickets();
          fetchStatistics();
        }}
      />

      {/* Close Ticket Confirmation Dialog */}
      <AlertDialog open={closeTicketDialogOpen} onOpenChange={setCloseTicketDialogOpen}>
        <AlertDialogContent className="bg-gray-900 border border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <X className="w-5 h-5 text-theme-red" />
              Close Support Ticket
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {ticketToClose && (
                <>
                  Are you sure you want to close ticket <span className="font-semibold text-white">{ticketToClose.ticket_id}</span>?
                  <br /><br />
                  You can still view the ticket and its conversation history later, but no further updates will be made.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              disabled={isClosingTicket}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseTicket}
              disabled={isClosingTicket}
              className="bg-theme-red hover:bg-theme-red/90 text-white"
            >
              {isClosingTicket && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Close Ticket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

  );
}
