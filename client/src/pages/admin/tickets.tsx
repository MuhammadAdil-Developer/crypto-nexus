import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Search, Filter, Eye, MessageSquare, Clock, User, Ticket as TicketIcon } from "lucide-react";
import { SAMPLE_TICKETS } from "@/lib/constants";

export default function AdminTickets() {
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Tickets" }
  ];

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
            <p className="text-gray-300 mt-1">Manage customer support requests and inquiries</p>
          </div>
          <Button className="bg-accent text-bg hover:bg-accent-2">
            Create Ticket
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <TicketIcon className="w-8 h-8 text-danger mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Open Tickets</p>
                  <p className="text-2xl font-bold text-white">12</p>
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
                  <p className="text-2xl font-bold text-white">5</p>
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
                  <p className="text-sm text-gray-400">Resolved Today</p>
                  <p className="text-2xl font-bold text-white">23</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <User className="w-8 h-8 text-accent mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Avg Response Time</p>
                  <p className="text-2xl font-bold text-white">2.3h</p>
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
                    className="pl-10 bg-surface-2 border-border text-white"
                    data-testid="search-tickets"
                  />
                </div>
              </div>
              <Select>
                <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="progress">In Progress</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                  <SelectValue placeholder="Assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  <SelectItem value="agent1">support_agent_1</SelectItem>
                  <SelectItem value="agent2">support_agent_2</SelectItem>
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
                  {SAMPLE_TICKETS.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-surface-2/50" data-testid={`ticket-row-${ticket.id}`}>
                      <td className="p-4">
                        <span className="font-mono text-accent">{ticket.ticketId}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center mr-3">
                            <span className="text-accent text-sm">{ticket.user[0].toUpperCase()}</span>
                          </div>
                          <span className="text-white">{ticket.user}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="max-w-xs">
                          <p className="text-white truncate">{ticket.subject}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={ticket.status} type={ticket.statusType} />
                      </td>
                      <td className="p-4">
                        <Badge 
                          variant={
                            ticket.priority === "High" ? "destructive" :
                            ticket.priority === "Medium" ? "secondary" :
                            "outline"
                          }
                          className="text-xs"
                        >
                          {ticket.priority}
                        </Badge>
                      </td>
                      <td className="p-4 text-gray-300">{ticket.assignedTo}</td>
                      <td className="p-4 text-gray-300">{ticket.created}</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`view-ticket-${ticket.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`reply-ticket-${ticket.id}`}>
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          {ticket.status === "Open" && (
                            <Button variant="ghost" size="sm" className="text-accent hover:text-blue-400" data-testid={`assign-ticket-${ticket.id}`}>
                              Assign
                            </Button>
                          )}
                          {ticket.status !== "Closed" && (
                            <Button variant="ghost" size="sm" className="text-success hover:text-green-400" data-testid={`close-ticket-${ticket.id}`}>
                              Close
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
                <Button variant="outline" size="sm" className="border-border text-gray-300 hover:bg-surface" data-testid="use-template-recovery">
                  Use Template
                </Button>
              </div>
              
              <div className="p-4 bg-surface-2 rounded-lg">
                <h4 className="text-white font-medium mb-2">Order Issue</h4>
                <p className="text-sm text-gray-400 mb-3">We apologize for the issue with your order. Please provide your order ID and we'll investigate immediately...</p>
                <Button variant="outline" size="sm" className="border-border text-gray-300 hover:bg-surface" data-testid="use-template-order">
                  Use Template
                </Button>
              </div>
              
              <div className="p-4 bg-surface-2 rounded-lg">
                <h4 className="text-white font-medium mb-2">General Inquiry</h4>
                <p className="text-sm text-gray-400 mb-3">Thank you for reaching out. We've received your inquiry and will respond within 24 hours...</p>
                <Button variant="outline" size="sm" className="border-border text-gray-300 hover:bg-surface" data-testid="use-template-general">
                  Use Template
                </Button>
              </div>
              
              <div className="p-4 bg-surface-2 rounded-lg">
                <h4 className="text-white font-medium mb-2">Vendor Application</h4>
                <p className="text-sm text-gray-400 mb-3">Thank you for your vendor application. We'll review your submission and respond within 3-5 business days...</p>
                <Button variant="outline" size="sm" className="border-border text-gray-300 hover:bg-surface" data-testid="use-template-vendor">
                  Use Template
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </AdminLayout>
  );
}