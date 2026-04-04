import EmptyState from '../../components/shared/EmptyState';

export default function AdminStatisticsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Statistics</h1>
        <p className="text-sm text-gray-500 mt-1">Analytics and reporting dashboard</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <EmptyState
          title="Statistics Coming Soon"
          message="The statistics module will be added later. Charts, reports, and analytics will appear here."
        />
      </div>
    </div>
  );
}
