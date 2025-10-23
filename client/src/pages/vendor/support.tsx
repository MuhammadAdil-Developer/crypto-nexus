import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HelpCircle, Plus, Search, MoreVertical, MessageSquare, FileText, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import ticketService from "@/services/ticketService";
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
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "In Progress":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Waiting for Response":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "Resolved":
      return "bg-green-100 text-green-800 border-green-200";
    case "Closed":
      return "bg-gray-700 text-gray-800 border-gray-700 bg-gray-900";
    default:
      return "bg-gray-700 text-gray-800 border-gray-700 bg-gray-900";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "High":
      return "bg-red-500";
    case "Medium":
      return "bg-yellow-500";
    case "Low":
      return "bg-green-500";
    default:
      return "bg-gray-8000";
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
  const [newTicket, setNewTicket] = useState({
    subject: "",
    category: "",
    priority: "medium",
    description: ""
  });

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
      const response = await ticketService.createTicket(newTicket);
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

  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Support & Help</h1>
            <p className="text-gray-400">Get help with your vendor account and marketplace features</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-blue-500 hover:bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                Create Ticket
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Support Ticket</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Subject</label>
                  <Input
                    placeholder="Brief description of your issue"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Category</label>
                    <Select value={newTicket.category} onValueChange={(value) => setNewTicket({...newTicket, category: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="account">Account</SelectItem>
                        <SelectItem value="payment">Payments</SelectItem>
                        <SelectItem value="listing">Listings</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="vendor_application">Vendor Application</SelectItem>
                        <SelectItem value="order_issue">Order Issue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Priority</label>
                    <Select value={newTicket.priority} onValueChange={(value) => setNewTicket({...newTicket, priority: value})}>
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
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <Textarea
                    placeholder="Describe your issue in detail..."
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                    className="min-h-32"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button variant="outline">Cancel</Button>
                  <Button onClick={handleCreateTicket} disabled={isCreatingTicket} className="bg-blue-500 hover:bg-blue-600">
                    {isCreatingTicket && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Ticket
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : totalTickets}
                  </div>
                  <p className="text-sm text-gray-400">Total Tickets</p>
                </div>
                <HelpCircle className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : openTickets}
                  </div>
                  <p className="text-sm text-gray-400">Open Tickets</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : waitingResponse}
                  </div>
                  <p className="text-sm text-gray-400">Waiting Response</p>
                </div>
                <AlertCircle className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : resolvedTickets}
                  </div>
                  <p className="text-sm text-gray-400">Resolved</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Support Tickets */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-white">Support Tickets</CardTitle>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="waiting_response">Waiting for Response</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">Loading tickets...</p>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No tickets found</p>
                </div>
              ) : (
                filteredTickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(ticket.priority)} mb-1`}></div>
                        <span className="text-xs text-gray-400 uppercase">{getPriorityDisplay(ticket.priority)}</span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="font-semibold text-white">{ticket.ticket_id}</h3>
                          <Badge className={`border ${getStatusColor(getStatusDisplay(ticket.status))}`}>
                            {getStatusDisplay(ticket.status)}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {ticket.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400 mb-1">{ticket.subject}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-400">
                          <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                          <span>Last update: {new Date(ticket.updated_at).toLocaleDateString()}</span>
                          <span>{ticket.response_count} responses</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedTicketId(ticket.id);
                          setIsTicketModalOpen(true);
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedTicketId(ticket.id);
                            setIsTicketModalOpen(true);
                          }}>
                            <FileText className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {ticket.status !== "resolved" && (
                            <DropdownMenuItem>
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Add Response
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

        {/* FAQ Section */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {faqData.map((category, categoryIndex) => (
                <div key={categoryIndex}>
                  <h3 className="text-lg font-semibold text-white mb-4">{category.category}</h3>
                  <div className="space-y-4">
                    {category.questions.map((faq, faqIndex) => (
                      <div key={faqIndex} className="border border-gray-700 bg-gray-900 rounded-lg p-4">
                        <h4 className="font-medium text-white mb-2">{faq.question}</h4>
                        <p className="text-gray-400 text-sm">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Contact Support</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <MessageSquare className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <h4 className="font-semibold text-white mb-2">Live Chat</h4>
                <p className="text-sm text-gray-400 mb-3">Chat with our support team</p>
                <p className="text-xs text-blue-600">Available 24/7</p>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <FileText className="w-8 h-8 text-green-600 mx-auto mb-3" />
                <h4 className="font-semibold text-white mb-2">Email Support</h4>
                <p className="text-sm text-gray-400 mb-3">vendor-support@cryptomarket.com</p>
                <p className="text-xs text-green-600">Response within 24h</p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <HelpCircle className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                <h4 className="font-semibold text-white mb-2">Help Center</h4>
                <p className="text-sm text-gray-400 mb-3">Browse our documentation</p>
                <p className="text-xs text-purple-600">Self-service guides</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
      </div>
    
  );
}
