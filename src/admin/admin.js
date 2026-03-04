import { useRouter } from 'next/router'
import { FaShoppingBasket, FaFileExport } from 'react-icons/fa'
import Link from 'next/link'
import { useState } from 'react'

export default function AdminDashboard() {
  const router = useRouter()
  const { username } = router.query
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)

  const exportCampaignData = async (format) => {
    try {
      // Example campaign data - replace with actual data from your campaign
      const campaignData = {
        campaign_id: "123",
        title: "Forest Conservation Project",
        description: "A project to protect local forests",
        total_votes: 150,
        status: "active",
        start_date: "2024-03-01",
        end_date: "2024-04-01"
      };

      const response = await fetch(`/admin/export/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignData)
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign_report.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export campaign data');
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-start justify-center p-10">
      <div className="relative w-full max-w-md space-y-6">
        {/* Campaign Basket */}
        <div className="absolute top-0 right-0">
          <FaShoppingBasket size={24} className="text-gray-600" />
        </div>

        <h1 className="text-xl font-semibold">
          Welcome, {username || 'Admin'}!
        </h1>

        <input
          type="text"
          placeholder="Search for nature-based projects"
          className="w-full border p-2 rounded"
        />

        <div className="flex flex-col space-y-4">
          <Link href="/admin/create" passHref>
            <button className="border p-3 rounded text-left font-semibold hover:bg-gray-100 w-full">
              Create a New Campaign
            </button>
          </Link>
          <Link href="/admin/active" passHref>
            <button className="border p-3 rounded text-left font-semibold hover:bg-gray-100 w-full">
              Active Campaigns
            </button>
          </Link>
          <Link href="/admin/pending" passHref>
            <button className="border p-3 rounded text-left font-semibold hover:bg-gray-100 w-full">
              Pending Votes
            </button>
          </Link>
          {/* Export Section */}
          <div className="border p-3 rounded">
            <h2 className="font-semibold mb-2">Export Campaign Data</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => exportCampaignData('csv')}
                className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Export as CSV
              </button>
              <button
                onClick={() => exportCampaignData('pdf')}
                className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Export as PDF
              </button>
              <button
                onClick={() => exportCampaignData('ppt')}
                className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Export as PPT
              </button>
              <button
                onClick={() => exportCampaignData('json')}
                className="p-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Export as JSON
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
