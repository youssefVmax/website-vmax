import { Button } from "./ui/button";

export interface DealDetails {
  id: string;
  customerName: string;
  salesAgent: string;
  salesAgentId: string;
  closingAgent?: string;
  closingAgentId?: string;
  amount: number;
  stage: string;
  status: string;
  createdDate: string;
  lastUpdated: string;
  notes?: string;
}

interface DealDetailsModalProps {
  deal: DealDetails | null;
  onClose: () => void;
}

export const DealDetailsModal = ({ deal, onClose }: DealDetailsModalProps) => {
  if (!deal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold">Deal Details</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Customer Information</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Name:</span> {deal.customerName}</p>
                <p><span className="font-medium">Deal Stage:</span> <span className="capitalize">{deal.stage}</span></p>
                <p><span className="font-medium">Status:</span> <span className="capitalize">{deal.status}</span></p>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Team</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Sales Agent:</span> {deal.salesAgent}</p>
                {deal.closingAgent && (
                  <p><span className="font-medium">Closing Agent:</span> {deal.closingAgent}</p>
                )}
                <p><span className="font-medium">Created:</span> {new Date(deal.createdDate).toLocaleDateString()}</p>
                <p><span className="font-medium">Last Updated:</span> {new Date(deal.lastUpdated).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Deal Value</h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                ${deal.amount.toLocaleString()}
              </p>
            </div>
            
            {deal.notes && (
              <div className="md:col-span-2">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Notes</h3>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                  <p className="whitespace-pre-line">{deal.notes}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              onClick={() => {
                // Navigate to the full deal page
                window.location.href = `/deals/${deal.id}`;
              }}
            >
              View Full Deal
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
