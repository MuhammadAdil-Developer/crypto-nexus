import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TicketConversation } from "./TicketConversation";
import { useToast } from "@/hooks/use-toast";
import ticketService from "@/services/ticketService";
import { Loader2, User, Calendar, Tag, AlertCircle } from "lucide-react";

interface TicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string | null;
  isAdmin?: boolean;
  onTicketUpdated?: () => void;
  templateText?: string;
}

interface Ticket {
  id: string;
  ticket_id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  user: string;
  user_type: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  response_count: number;
  user_username?: string;
  user_email?: string;
  assigned_to_username?: string;
}

export function TicketDetailModal({
  isOpen,
  onClose,
  ticketId,
  isAdmin = false,
  onTicketUpdated,
  templateText
}: TicketDetailModalProps) {
  const { toast } = useToast();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (isOpen && ticketId) {
      fetchTicketDetails();
    }
  }, [isOpen, ticketId]);

  const fetchTicketDetails = async () => {
    if (!ticketId) return;

    try {
      setLoading(true);
      const response = await ticketService.getTicket(ticketId);
      if (response.success) {
        setTicket(response.data || null);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to fetch ticket details",
          variant: "destructive"
        });
        onClose();
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch ticket details",
        variant: "destructive"
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!ticketId) return;

    try {
      setUpdatingStatus(true);
      const response = await ticketService.updateTicketStatus(ticketId, newStatus);
      if (response.success) {
        toast({
          title: "Success",
          description: "Ticket status updated successfully"
        });

        // Update local ticket data
        setTicket(prev => prev ? { ...prev, status: newStatus } : null);

        // Notify parent component
        if (onTicketUpdated) {
          onTicketUpdated();
        }
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
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAssignTicket = async (assignedTo: string) => {
    if (!ticketId) return;

    try {
      const response = await ticketService.assignTicket(ticketId, assignedTo);
      if (response.success) {
        toast({
          title: "Success",
          description: "Ticket assigned successfully"
        });

        // Update local ticket data
        setTicket(prev => prev ? { ...prev, assigned_to: assignedTo } : null);

        // Notify parent component
        if (onTicketUpdated) {
          onTicketUpdated();
        }
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
    }
  };

  const handleCloseTicket = async () => {
    if (!ticketId) return;

    try {
      const response = await ticketService.closeTicket(ticketId);
      if (response.success) {
        toast({
          title: "Success",
          description: "Ticket closed successfully"
        });

        // Update local ticket data
        setTicket(prev => prev ? { ...prev, status: 'closed' } : null);

        // Notify parent component
        if (onTicketUpdated) {
          onTicketUpdated();
        }
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

  const handleReopenTicket = async () => {
    if (!ticketId) return;

    try {
      const response = await ticketService.reopenTicket(ticketId);
      if (response.success) {
        toast({
          title: "Success",
          description: "Ticket reopened successfully"
        });

        // Update local ticket data
        setTicket(prev => prev ? { ...prev, status: 'open', closed_at: null } : null);

        // Notify parent component
        if (onTicketUpdated) {
          onTicketUpdated();
        }
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to reopen ticket",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error reopening ticket:', error);
      toast({
        title: "Error",
        description: "Failed to reopen ticket",
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-theme-cyan-dim text-theme-cyan border-theme-cyan/30';
      case 'in_progress': return 'bg-theme-cyan/20 text-theme-cyan';
      case 'waiting_response': return 'bg-yellow-500/20 text-yellow-500';
      case 'resolved': return 'bg-theme-cyan/10 text-theme-cyan';
      case 'closed': return 'bg-theme-red/20 text-theme-red border-theme-red/30';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-theme-red';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-theme-cyan';
      default: return 'bg-gray-500';
    }
  };

  const handleMessageSent = () => {
    // Refresh ticket details when a message is sent
    fetchTicketDetails();

    // Notify parent component
    if (onTicketUpdated) {
      onTicketUpdated();
    }
  };

  if (!isOpen || !ticketId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-2xl lg:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center space-x-2">
            <span>Ticket Details - {ticket?.ticket_id}</span>
            {ticket && (
              <Badge className={`${getStatusColor(ticket.status)} text-white`}>
                {getStatusDisplay(ticket.status)}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-theme-cyan" />
            <p className="text-gray-400">Loading ticket details...</p>
          </div>
        ) : ticket ? (
          <div className="space-y-6">
            {/* Ticket Information */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Ticket Info */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="border border-gray-700 bg-gray-800">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">{ticket.subject}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-4">
                        <Badge className={`${getPriorityColor(ticket.priority)} text-white`}>
                          {getPriorityDisplay(ticket.priority)} Priority
                        </Badge>
                        <Badge variant="outline" className="text-gray-300">
                          {ticket.category}
                        </Badge>
                      </div>
                      <div className="bg-gray-700 p-4 rounded-lg">
                        <p className="text-gray-300 whitespace-pre-wrap">{ticket.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Conversation */}
                <TicketConversation
                  ticketId={ticketId}
                  isAdmin={isAdmin}
                  onMessageSent={handleMessageSent}
                  templateText={templateText}
                />
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* User Information */}
                <Card className="border border-gray-700 bg-gray-800">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-white mb-3 flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      User Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">Username:</span>
                        <span className="text-white ml-2">{ticket.user_username || 'Unknown'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Email:</span>
                        <span className="text-white ml-2">{ticket.user_email || 'Not available'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Type:</span>
                        <span className="text-white ml-2 capitalize">{ticket.user_type}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Ticket Details */}
                <Card className="border border-gray-700 bg-gray-800">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-white mb-3 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Ticket Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">Ticket ID:</span>
                        <span className="text-white ml-2 font-mono">{ticket.ticket_id}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Created:</span>
                        <span className="text-white ml-2">{new Date(ticket.created_at).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Last Updated:</span>
                        <span className="text-white ml-2">{new Date(ticket.updated_at).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Responses:</span>
                        <span className="text-white ml-2">{ticket.response_count}</span>
                      </div>
                      {ticket.assigned_to_username && (
                        <div>
                          <span className="text-gray-400">Assigned to:</span>
                          <span className="text-white ml-2">{ticket.assigned_to_username}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Admin Actions */}
                {isAdmin && (
                  <Card className="border border-gray-700 bg-gray-800">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-white mb-3">Actions</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-gray-400 mb-2 block">Status</label>
                          <Select
                            value={ticket.status}
                            onValueChange={handleStatusUpdate}
                            disabled={updatingStatus}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="waiting_response">Waiting Response</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {ticket.status !== "closed" && (
                          <Button
                            onClick={handleCloseTicket}
                            className="w-full bg-theme-red hover:bg-theme-red-dark text-white"
                          >
                            Close Ticket
                          </Button>
                        )}

                        {ticket.status === "closed" && (
                          <Button
                            onClick={handleReopenTicket}
                            variant="default"
                            className="w-full bg-theme-cyan hover:bg-theme-cyan/90 text-black"
                          >
                            Reopen Ticket
                          </Button>
                        )}

                        <Button
                          onClick={onClose}
                          variant="outline"
                          className="w-full"
                        >
                          Close Modal
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* User Actions */}
                {!isAdmin && (
                  <Card className="border border-gray-700 bg-gray-800">
                    <CardContent className="p-4">
                      <Button
                        onClick={onClose}
                        variant="outline"
                        className="w-full"
                      >
                        Close
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">Ticket not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
