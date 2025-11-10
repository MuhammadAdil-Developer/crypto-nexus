import { useState, useEffect } from "react";
import { HelpCircle, MessageSquare, FileText, Phone, Mail, ChevronDown, Search, Loader2, MoreVertical, Plus } from "lucide-react";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import ticketService from "@/services/ticketService";
import { TicketDetailModal } from "@/components/tickets/TicketDetailModal";

const faqData = [
  {
    question: "How do I make a purchase?",
    answer: "To make a purchase, browse our listings, click on a product you want, and follow the checkout process. You'll pay with cryptocurrency (BTC or XMR) and receive your digital product within minutes."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept Bitcoin (BTC) and Monero (XMR) for all transactions. This ensures privacy and security for both buyers and vendors."
  },
  {
    question: "How does escrow protection work?",
    answer: "Escrow protection holds your payment until you confirm receipt of your digital product. This protects you from fraud and ensures vendors deliver quality products."
  },
  {
    question: "What if my account doesn't work?",
    answer: "All products come with a warranty period. If your account stops working during the warranty period, contact the vendor through our messaging system for a replacement."
  },
  {
    question: "How do I contact a vendor?",
    answer: "Use our built-in messaging system to communicate with vendors. Go to Messages in your dashboard to start or continue conversations."
  },
  {
    question: "Can I get a refund?",
    answer: "Refunds are handled on a case-by-case basis. If there's an issue with your purchase, open a dispute and our support team will review your case."
  },
  {
    question: "How do I track my orders?",
    answer: "Visit the Orders section in your dashboard to see the status of all your purchases. You'll get notifications for status updates."
  },
  {
    question: "Is my personal information safe?",
    answer: "We prioritize privacy and use minimal data collection. Your transactions are anonymous and we don't store unnecessary personal information."
  }
];

export default function BuyerSupport() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    category: "",
    priority: "medium",
    description: ""
  });
  
  // Ticket management state
  const [tickets, setTickets] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  const filteredFAQ = faqData.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const filteredTickets = tickets.filter(ticket => {
    if (statusFilter === "all") return true;
    return ticket.status === statusFilter;
  });

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ticketForm.subject || !ticketForm.description || !ticketForm.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmittingTicket(true);
      const response = await ticketService.createTicket(ticketForm);
      if (response.success) {
        toast({
          title: "Success",
          description: "Ticket submitted successfully! We'll get back to you soon."
        });
        setTicketForm({
          subject: "",
          category: "",
          priority: "medium",
          description: ""
        });
        // Refresh tickets list
        await fetchTickets();
        await fetchStatistics();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to submit ticket",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast({
        title: "Error",
        description: "Failed to submit ticket",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Helper functions for ticket display
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'text-green-400 bg-green-900/20';
      case 'in_progress':
        return 'text-blue-400 bg-blue-900/20';
      case 'waiting_response':
        return 'text-yellow-400 bg-yellow-900/20';
      case 'resolved':
        return 'text-gray-400 bg-gray-900/20';
      case 'closed':
        return 'text-red-400 bg-red-900/20';
      default:
        return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getStatusDisplay = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityDisplay = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  return (
    <BuyerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 text-white border border-gray-700">
          <div className="flex items-center space-x-3">
            <HelpCircle className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Help & Support</h1>
              <p className="text-gray-300">Get help with your account and orders</p>
            </div>
          </div>
        </div>

        {/* Quick Contact Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border border-gray-700 bg-gray-900 hover:shadow-xl transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-2">Live Chat</h3>
              <p className="text-sm text-gray-400 mb-4">
                Get instant help from our support team
              </p>
              <Button 
                className="w-full bg-gray-700 cursor-pointer"
                onClick={() => {
                  toast({
                    title: "Live Chat",
                    description: "Live chat feature coming soon! Please submit a ticket for immediate support.",
                  });
                }}
              >
                Start Chat
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-gray-700 bg-gray-900 hover:shadow-xl transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-2">Email Support</h3>
              <p className="text-sm text-gray-400 mb-4">
                Send us an email and we'll respond within 24h
              </p>
              <Button 
                variant="outline" 
                className="w-full cursor-pointer"
                onClick={() => {
                  window.location.href = 'mailto:support@cryptomarket.com';
                }}
              >
                support@cryptomarket.com
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-gray-700 bg-gray-900 hover:shadow-xl transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-2">Submit Ticket</h3>
              <p className="text-sm text-gray-400 mb-4">
                Create a detailed support request
              </p>
              <Button 
                variant="outline" 
                className="w-full cursor-pointer"
                onClick={() => {
                  // Scroll to ticket form
                  const ticketForm = document.getElementById('ticket-form-section');
                  if (ticketForm) {
                    ticketForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                Create Ticket
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* FAQ Section */}
          <div>
            <Card className="border border-gray-700 bg-gray-900">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5" />
                  <span>Frequently Asked Questions</span>
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search FAQ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="space-y-2">
                  {filteredFAQ.map((item, index) => (
                    <AccordionItem 
                      key={index} 
                      value={`item-${index}`}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg px-4"
                    >
                      <AccordionTrigger className="text-left hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-600 dark:text-gray-400 pb-4">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* Support Ticket Form */}
          <div id="ticket-form-section">
            <Card className="border border-gray-700 bg-gray-900">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Submit Support Ticket</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitTicket} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Brief description of your issue"
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm({...ticketForm, subject: e.target.value})}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={ticketForm.category} onValueChange={(value) => setTicketForm({...ticketForm, category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="order_issue">Order Issue</SelectItem>
                          <SelectItem value="payment">Payment Problem</SelectItem>
                          <SelectItem value="account">Account Access</SelectItem>
                          <SelectItem value="technical">Technical Issue</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={ticketForm.priority} onValueChange={(value) => setTicketForm({...ticketForm, priority: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
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

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Please provide detailed information about your issue..."
                      className="min-h-32"
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                      required
                    />
                  </div>

                  <Button type="submit" disabled={isSubmittingTicket} className="w-full bg-gray-700">
                    {isSubmittingTicket && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Submit Ticket
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* My Support Tickets */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span>My Support Tickets</span>
              </CardTitle>
              <div className="flex items-center space-x-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
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
                <Button 
                  onClick={() => setIsCreatingTicket(true)}
                  size="sm"
                  className="bg-gray-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Ticket
                </Button>
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
                  <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">No tickets found</p>
                  <p className="text-sm text-gray-500">Create your first support ticket above</p>
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
                        View Conversation
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
                            <MessageSquare className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Support Resources */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle>Additional Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-800 rounded-lg">
                <FileText className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <h4 className="font-medium mb-2">User Guide</h4>
                <p className="text-sm text-gray-400 mb-3">Complete guide to using our platform</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => {
                    toast({
                      title: "User Guide",
                      description: "User guide documentation coming soon!",
                    });
                  }}
                >
                  Read Guide
                </Button>
              </div>

              <div className="text-center p-4 bg-gray-800 rounded-lg">
                <MessageSquare className="w-8 h-8 text-green-600 mx-auto mb-3" />
                <h4 className="font-medium mb-2">Community Forum</h4>
                <p className="text-sm text-gray-400 mb-3">Connect with other users and get tips</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => {
                    toast({
                      title: "Community Forum",
                      description: "Community forum coming soon!",
                    });
                  }}
                >
                  Visit Forum
                </Button>
              </div>

              <div className="text-center p-4 bg-gray-800 rounded-lg">
                <HelpCircle className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                <h4 className="font-medium mb-2">Video Tutorials</h4>
                <p className="text-sm text-gray-400 mb-3">Step-by-step video guides</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => {
                    toast({
                      title: "Video Tutorials",
                      description: "Video tutorials coming soon!",
                    });
                  }}
                >
                  Watch Videos
                </Button>
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
    </BuyerLayout>
  );
}
