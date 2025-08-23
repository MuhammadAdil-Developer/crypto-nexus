import { useState } from "react";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpCircle, Plus, Search, MoreVertical, MessageSquare, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [newTicket, setNewTicket] = useState({
    subject: "",
    category: "",
    priority: "Medium",
    description: ""
  });

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateTicket = () => {
    // Handle ticket creation
    console.log("Creating ticket:", newTicket);
    setNewTicket({
      subject: "",
      category: "",
      priority: "Medium",
      description: ""
    });
  };

  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === "Open" || t.status === "In Progress").length;
  const waitingResponse = tickets.filter(t => t.status === "Waiting for Response").length;

  return (
    <VendorLayout>
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
                        <SelectItem value="Account">Account</SelectItem>
                        <SelectItem value="Payments">Payments</SelectItem>
                        <SelectItem value="Listings">Listings</SelectItem>
                        <SelectItem value="Technical">Technical</SelectItem>
                        <SelectItem value="General">General</SelectItem>
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
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
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
                  <Button onClick={handleCreateTicket} className="bg-blue-500 hover:bg-blue-600">
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
                  <div className="text-2xl font-bold text-white">{totalTickets}</div>
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
                  <div className="text-2xl font-bold text-yellow-600">{openTickets}</div>
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
                  <div className="text-2xl font-bold text-purple-600">{waitingResponse}</div>
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
                    {tickets.filter(t => t.status === "Resolved").length}
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
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Waiting for Response">Waiting for Response</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(ticket.priority)} mb-1`}></div>
                      <span className="text-xs text-gray-400 uppercase">{ticket.priority}</span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="font-semibold text-white">{ticket.id}</h3>
                        <Badge className={`border ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {ticket.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mb-1">{ticket.subject}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-400">
                        <span>Created: {ticket.created}</span>
                        <span>Last update: {ticket.lastUpdate}</span>
                        <span>{ticket.responses} responses</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Button size="sm" variant="outline">
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
                        <DropdownMenuItem>
                          <FileText className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {ticket.status !== "Resolved" && (
                          <DropdownMenuItem>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Add Response
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>

            {filteredTickets.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <HelpCircle className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No tickets found</h3>
                <p className="text-gray-400">Try adjusting your search criteria or create a new ticket.</p>
              </div>
            )}
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
      </div>
    </VendorLayout>
  );
}