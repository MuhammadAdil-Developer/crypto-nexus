import { useState, useEffect } from "react";
import { HelpCircle, MessageSquare, FileText, Phone, Mail, ChevronDown, Search, Loader2, MoreVertical, Plus, X, Play, BookOpen, Users, Shield, Zap, ExternalLink, Lock, ChevronRight } from "lucide-react";
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
import ticketService from "@/services/ticketService";
import contentService from "@/services/contentService";
import { TicketDetailModal } from "@/components/tickets/TicketDetailModal";
import { PageBanner } from "@/components/PageBanner";

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
  },
  {
    question: "What happens if my payment is delayed due to blockchain congestion?",
    answer: "Our payment system continuously monitors the blockchain. If your payment is confirmed after the 30-minute window due to network congestion, your order will still be processed automatically once the confirmation is received. You do not need to worry."
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

  // Close ticket confirmation dialog state
  const [closeTicketDialogOpen, setCloseTicketDialogOpen] = useState(false);
  const [ticketToClose, setTicketToClose] = useState<any>(null);
  const [isClosingTicket, setIsClosingTicket] = useState(false);

  // Modal states for support resources
  const [isUserGuideModalOpen, setIsUserGuideModalOpen] = useState(false);
  const [isForumModalOpen, setIsForumModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [dynamicResources, setDynamicResources] = useState<any[]>([]);
  const [forumCategories, setForumCategories] = useState<any[]>([]);
  const [forumPosts, setForumPosts] = useState<any[]>([]);
  const [isResourcesLoading, setIsResourcesLoading] = useState(true);
  const [isModerationModalOpen, setIsModerationModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const filteredFAQ = faqData.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    fetchTickets();
    fetchStatistics();
    fetchDynamicContent();
  }, []);

  const fetchDynamicContent = async () => {
    setIsResourcesLoading(true);
    const [resResult, catResult, postResult] = await Promise.all([
      contentService.getResources(),
      contentService.getCategories(),
      contentService.getPosts()
    ]);

    if (resResult.success) {
      const data = resResult.data;
      setDynamicResources(Array.isArray(data) ? data : (data.results || []));
    }

    if (catResult.success) {
      const data = catResult.data;
      setForumCategories(Array.isArray(data) ? data : (data.results || []));
    }

    if (postResult.success) {
      const data = postResult.data;
      setForumPosts(Array.isArray(data) ? data : (data.results || []));
    }

    setIsResourcesLoading(false);
  };

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
        return 'text-theme-cyan bg-theme-cyan/10';
      case 'in_progress':
        return 'text-theme-cyan bg-theme-cyan/20';
      case 'waiting_response':
        return 'text-yellow-400 bg-yellow-900/20';
      case 'resolved':
        return 'text-gray-400 bg-gray-900/20';
      case 'closed':
        return 'text-theme-red bg-theme-red/10';
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
        return 'bg-theme-red';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-theme-cyan';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityDisplay = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
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
    <BuyerLayout>
      <div className="space-y-6">
        {/* Header Banner */}
        <PageBanner
          title="Help"
          subtitle="Get help with your account and orders"
          type="buyer"
        />

        {/* Quick Contact Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border border-gray-700 bg-gray-900 hover:shadow-xl transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-theme-cyan to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-6 h-6 text-black" />
              </div>
              <h3 className="font-semibold text-white mb-2">Live Chat</h3>
              <p className="text-sm text-gray-400 mb-4">
                Get instant help from our support team
              </p>
              <Button
                className="w-full bg-theme-cyan text-black hover:bg-theme-cyan/90 cursor-pointer"
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
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 bg-gray-800 border border-gray-700">
                <Mail className="w-6 h-6 text-theme-cyan" />
              </div>
              <h3 className="font-semibold text-white mb-2">Email Support</h3>
              <p className="text-sm text-gray-400 mb-4">
                Send us an email and we'll respond within 24h
              </p>
              <Button
                variant="outline"
                className="w-full cursor-pointer"
                onClick={() => {
                  window.location.href = 'mailto:support@accountzclub.com';
                }}
              >
                support@accountzclub.com
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-gray-700 bg-gray-900 hover:shadow-xl transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 bg-gray-800 border border-gray-700">
                <FileText className="w-6 h-6 text-theme-red" />
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
                      onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={ticketForm.category} onValueChange={(value) => setTicketForm({ ...ticketForm, category: value })}>
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
                      <Select value={ticketForm.priority} onValueChange={(value) => setTicketForm({ ...ticketForm, priority: value })}>
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
                      onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                      required
                    />
                  </div>

                  <Button type="submit" disabled={isSubmittingTicket} className="w-full bg-theme-cyan hover:bg-theme-cyan/90 text-black">
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span>My Support Tickets</span>
              </CardTitle>
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
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
                  onClick={() => {
                    // Scroll to ticket form section
                    const ticketFormSection = document.getElementById('ticket-form-section');
                    if (ticketFormSection) {
                      ticketFormSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      // Focus on first input field after scroll
                      setTimeout(() => {
                        const subjectInput = document.getElementById('subject');
                        if (subjectInput) {
                          subjectInput.focus();
                        }
                      }, 500);
                    }
                  }}
                  size="sm"
                  className="bg-theme-cyan hover:bg-theme-cyan/90 text-black w-full sm:w-auto"
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
                  <div key={ticket.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <div className="flex items-start md:items-center space-x-4">
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
                        <div className="flex flex-wrap gap-x-4 gap-y-1 items-center text-xs text-gray-400">
                          <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                          <span>Last update: {new Date(ticket.updated_at).toLocaleDateString()}</span>
                          <span>{ticket.response_count} responses</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 md:self-auto self-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTicketId(ticket.id);
                          setIsTicketModalOpen(true);
                        }}
                        className="w-full sm:w-auto"
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
                        <DropdownMenuContent align="end" className="w-[90vw] sm:w-auto">
                          <DropdownMenuItem onClick={() => {
                            setSelectedTicketId(ticket.id);
                            setIsTicketModalOpen(true);
                          }}>
                            <MessageSquare className="w-4 h-4 mr-2" />
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

        {/* Support Resources */}
        <Card className="border border-gray-700 bg-gray-900 overflow-hidden shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-gray-800/50 to-transparent">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-accent" />
              Additional Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Resources & Guides Card */}
              <div className="text-center p-6 bg-gray-800 hover:bg-gray-750 transition-all rounded-xl border border-gray-700 hover:border-accent/40 group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-accent/20 group-hover:bg-accent transition-colors" />
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-accent group-hover:scale-110 transition-transform">
                  <BookOpen className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-white mb-2 text-lg">Resources & Guides</h4>
                <p className="text-sm text-gray-400 mb-4 h-10 line-clamp-2">Complete platform guides, step-by-step tutorials and documentation.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-accent/30 text-accent hover:bg-accent hover:text-bg font-bold w-full"
                  onClick={() => setIsUserGuideModalOpen(true)}
                >
                  View All Resources
                </Button>
              </div>

              {/* Forum Categories Card */}
              <div className="text-center p-6 bg-gray-800 hover:bg-gray-750 transition-all rounded-xl border border-gray-700 hover:border-theme-red/40 group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-theme-red/20 group-hover:bg-theme-red transition-colors" />
                <div className="w-14 h-14 bg-theme-red/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-theme-red group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-white mb-2 text-lg">Forum Categories</h4>
                <p className="text-sm text-gray-400 mb-4 h-10 line-clamp-2">Browse the community forum by categories and interest.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-theme-red/30 text-theme-red hover:bg-theme-red hover:text-white font-bold w-full"
                  onClick={() => setIsForumModalOpen(true)}
                >
                  Browse Categories
                </Button>
              </div>

              {/* Forum Moderation / Posts Card */}
              <div className="text-center p-6 bg-gray-800 hover:bg-gray-750 transition-all rounded-xl border border-gray-700 hover:border-theme-cyan/40 group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-theme-cyan/20 group-hover:bg-theme-cyan transition-colors" />
                <div className="w-14 h-14 bg-theme-cyan/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-theme-cyan group-hover:scale-110 transition-transform">
                  <Shield className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-white mb-2 text-lg">Forum Moderation</h4>
                <p className="text-sm text-gray-400 mb-4 h-10 line-clamp-2">View the latest discussions and reported forum content status.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-theme-cyan/30 text-theme-cyan hover:bg-theme-cyan hover:text-black font-bold w-full"
                  onClick={() => {
                    setCategoryFilter(null);
                    setIsModerationModalOpen(true);
                  }}
                >
                  View Discussions
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

        {/* User Guide Modal */}
        {isUserGuideModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" style={{ background: 'linear-gradient(to bottom, #010717, #14182B)' }}>
              <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 p-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-accent">
                    <BookOpen className="w-5 h-5 text-black" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Resources & Guides</h2>
                </div>
                <button
                  onClick={() => setIsUserGuideModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dynamicResources.map((res) => (
                    <div key={res.id} className="bg-gray-800/50 rounded-xl p-5 border border-gray-700 hover:border-accent/30 transition-all">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-accent/10 rounded-lg text-accent">
                          {res.icon === 'FileText' ? <FileText className="w-5 h-5" /> :
                            res.icon === 'PlayCircle' ? <Play className="w-5 h-5" /> :
                              res.icon === 'MessageSquare' ? <MessageSquare className="w-5 h-5" /> :
                                <BookOpen className="w-5 h-5" />}
                        </div>
                        <h4 className="font-bold text-white">{res.title}</h4>
                      </div>
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{res.description}</p>
                      <Button
                        variant="link"
                        className="text-accent p-0 h-auto hover:underline flex items-center gap-2"
                        onClick={() => res.link && window.open(res.link, '_blank')}
                      >
                        {res.link_text || 'Access Guide'}
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  {dynamicResources.length === 0 && (
                    <div className="col-span-2 py-12 text-center text-gray-500 italic">No guides available yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Community Forum Modal */}
        {isForumModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" style={{ background: 'linear-gradient(to bottom, #010717, #14182B)' }}>
              <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 p-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-theme-red">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Community Forum</h2>
                </div>
                <button
                  onClick={() => setIsForumModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {forumCategories.map(cat => (
                    <div
                      key={cat.id}
                      className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-accent/40 transition-colors cursor-pointer group"
                      onClick={() => {
                        setCategoryFilter(cat.id);
                        setIsModerationModalOpen(true);
                      }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-accent/10 text-accent group-hover:bg-accent group-hover:text-bg transition-colors">
                          {cat.icon === 'Shield' ? <Shield className="w-4 h-4" /> :
                            cat.icon === 'Zap' ? <Zap className="w-4 h-4" /> :
                              cat.icon === 'HelpCircle' ? <HelpCircle className="w-4 h-4" /> :
                                <MessageSquare className="w-4 h-4" />}
                        </div>
                        <h4 className="font-semibold text-white group-hover:text-accent transition-colors">{cat.name}</h4>
                      </div>
                      <p className="text-sm text-gray-400 mb-3 line-clamp-2 italic">{cat.description || "No description provided."}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{cat.post_count || 0} topics</span>
                        <span className="text-accent underline group-hover:no-underline font-bold">Visit Community</span>
                      </div>
                    </div>
                  ))}
                  {forumCategories.length === 0 && (
                    <div className="col-span-2 py-12 text-center text-gray-500 italic">No forum categories have been created yet.</div>
                  )}
                </div>

                <div className="bg-gray-800/30 rounded-xl p-5 border border-gray-700">
                  <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-theme-red" />
                    Forum Guidelines
                  </h4>
                  <ul className="text-sm text-gray-400 space-y-2 list-disc list-inside">
                    <li>Maintain respect and professional conduct.</li>
                    <li>No promotional content or unauthorized links.</li>
                    <li>Reporting bugs and security issues is encouraged.</li>
                    <li>Read pinned threads for specific category rules.</li>
                  </ul>
                </div>

                <div className="bg-accent/5 rounded-xl p-5 border border-accent/20 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Need Detailed Help?</h4>
                      <p className="text-xs text-gray-400">Check out our comprehensive platform user guides.</p>
                    </div>
                  </div>
                  <Button
                    variant="link"
                    onClick={() => {
                      setIsForumModalOpen(false);
                      setIsUserGuideModalOpen(true);
                    }}
                    className="text-accent font-bold hover:no-underline flex items-center gap-2"
                  >
                    Open User Guide
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Forum Moderation / Posts Modal */}
        {isModerationModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" style={{ background: 'linear-gradient(to bottom, #010717, #14182B)' }}>
              <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 p-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-theme-cyan">
                    <Shield className="w-5 h-5 text-black" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Forum Moderation</h2>
                </div>
                <button
                  onClick={() => setIsModerationModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-sm">
                    {categoryFilter
                      ? `Viewing posts in: ${forumCategories.find(c => c.id === categoryFilter)?.name}`
                      : "Viewing current moderated discussions and public forum posts."}
                  </p>
                  {categoryFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCategoryFilter(null)}
                      className="text-accent hover:text-accent/80 h-auto p-0 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Clear Filter
                    </Button>
                  )}
                </div>
                {forumPosts
                  .filter(post => !categoryFilter || post.category === categoryFilter)
                  .map((post) => (
                    <div key={post.id} className="bg-gray-800/30 p-5 rounded-xl border border-gray-800 hover:bg-gray-800/50 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-lg text-white">{post.title}</h4>
                        <Badge className="bg-theme-cyan/10 text-theme-cyan border-theme-cyan/20">
                          {post.category_name}
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{post.content}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-300">By {post.author_name}</span>
                          <span>•</span>
                          <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex gap-2">
                          {post.is_pinned && <Badge className="bg-blue-500/20 text-blue-400 border-none scale-90">Pinned</Badge>}
                          {post.is_locked && <Badge className="bg-gray-600 text-white border-none flex items-center gap-1 scale-90">Locked</Badge>}
                        </div>
                      </div>
                    </div>
                  ))}
                {forumPosts.length === 0 && (
                  <div className="py-24 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 italic text-lg">No discussions available for viewing.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Video Tutorials Modal */}
        {isVideoModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto" style={{ background: 'linear-gradient(to bottom, #010717, #14182B)' }}>
              <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 p-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-theme-red">
                    <Play className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Video Tutorials</h2>
                </div>
                <button
                  onClick={() => setIsVideoModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Video 1 */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-white">Getting Started Guide</h3>
                    <div className="aspect-video rounded-lg overflow-hidden bg-gray-800">
                      <iframe
                        width="100%"
                        height="100%"
                        src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                        title="Getting Started Guide"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      ></iframe>
                    </div>
                    <p className="text-sm text-gray-400">Learn how to create an account and navigate the platform</p>
                  </div>

                  {/* Video 2 */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-white">Making Your First Purchase</h3>
                    <div className="aspect-video rounded-lg overflow-hidden bg-gray-800">
                      <iframe
                        width="100%"
                        height="100%"
                        src="https://www.youtube.com/embed/jNQXAC9IVRw"
                        title="Making Your First Purchase"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      ></iframe>
                    </div>
                    <p className="text-sm text-gray-400">Step-by-step guide to purchasing products</p>
                  </div>

                  {/* Video 3 */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-white">Understanding Escrow Protection</h3>
                    <div className="aspect-video rounded-lg overflow-hidden bg-gray-800">
                      <iframe
                        width="100%"
                        height="100%"
                        src="https://www.youtube.com/embed/9bZkp7q19f0"
                        title="Understanding Escrow Protection"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      ></iframe>
                    </div>
                    <p className="text-sm text-gray-400">How escrow protects your transactions</p>
                  </div>

                  {/* Video 4 */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-white">Payment Methods Explained</h3>
                    <div className="aspect-video rounded-lg overflow-hidden bg-gray-800">
                      <iframe
                        width="100%"
                        height="100%"
                        src="https://www.youtube.com/embed/kJQP7kiw5Fk"
                        title="Payment Methods Explained"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      ></iframe>
                    </div>
                    <p className="text-sm text-gray-400">Learn about Bitcoin and Monero payments</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
    </BuyerLayout>
  );
}
