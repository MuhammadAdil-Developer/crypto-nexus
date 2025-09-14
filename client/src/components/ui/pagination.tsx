import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
  onItemsPerPageChange,
  className
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex items-center justify-between px-6 py-4 border-t border-border", className)}>
      {/* Items per page selector */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-400">Show</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange?.(Number(e.target.value))}
          className="bg-gray-800 border border-gray-600 text-white text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent appearance-none cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.5rem center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1.5em 1.5em',
            paddingRight: '2.5rem'
          }}
        >
          <option value={10} className="bg-gray-800 text-white">10</option>
          <option value={25} className="bg-gray-800 text-white">25</option>
          <option value={50} className="bg-gray-800 text-white">50</option>
          <option value={100} className="bg-gray-800 text-white">100</option>
        </select>
        <span className="text-sm text-gray-400">per page</span>
      </div>

      {/* Page info */}
      <div className="text-sm text-gray-400">
        Showing {startItem} to {endItem} of {totalItems} results
      </div>

      {/* Pagination controls */}
      <div className="flex items-center space-x-1">
        {/* Previous button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="border-border text-gray-300 hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Page numbers */}
        {getVisiblePages().map((page, index) => (
          <div key={index}>
            {page === '...' ? (
              <div className="px-3 py-2 text-gray-400">
                <MoreHorizontal className="w-4 h-4" />
              </div>
            ) : (
              <Button
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page as number)}
                className={cn(
                  "min-w-[40px]",
                  currentPage === page
                    ? "bg-accent text-white hover:bg-accent/90"
                    : "border-border text-gray-300 hover:bg-surface-2"
                )}
              >
                {page}
              </Button>
            )}
          </div>
        ))}

        {/* Next button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="border-border text-gray-300 hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
