import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import placeholderImage from './assets/questionPlaceholder.png';

interface Transaction {
  transaction_id: number;
  user_id: number;
  requirement_id: number;
  amount_paid: number;
  description: string;
  date: string;
  type: string;
  payment_status: string;
}

interface Requirement {
  requirement_id: number;
  title: string;
  description: string;
  start_datetime?: string;
  end_datetime?: string;
  due_date?: string;
  location?: string;
  requirement_type: string;
  status?: string;
  club_id: number;
  amount_due?: number;
  req_picture?: string;
  date_added?: string;
}

const MemberDashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [feeRequirements, setFeeRequirements] = useState<Requirement[]>([]);
  const [eventRequirements, setEventRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [clubId, setClubId] = useState<number | null>(null);

  useEffect(() => {
    // Fetch user info
    fetch('http://localhost/my-app-server/get_current_user.php', { credentials: 'include' })
      .then(res => res.json())
      .then(user => {
        if (user && user.user_id) {
          setUserId(user.user_id);
          setUserName(user.user_fname ? `${user.user_fname} ${user.user_lname || ''}` : 'Member');
          setClubId(user.club_id || null);
        }
      });
  }, []);

  useEffect(() => {
    if (!userId || !clubId) return;
    setLoading(true);
    // Fetch transactions (fees)
    fetch(`http://localhost/my-app-server/get_transaction.php?user_id=${userId}&type=fee`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setTransactions(Array.isArray(data) ? data : []));
    // Fetch requirements (fees)
    fetch(`http://localhost/my-app-server/get_requirement.php?type=fee&club_id=${clubId}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setFeeRequirements(Array.isArray(data) ? data : []));
    // Fetch requirements (events)
    fetch(`http://localhost/my-app-server/get_requirement.php?type=event&club_id=${clubId}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        // Only future events with correct type and club
        const now = new Date();
        setEventRequirements(Array.isArray(data) ? data.filter((e: Requirement) => e.requirement_type === 'event' && new Date(e.end_datetime || e.due_date || '') > now) : []);
        setLoading(false);
      });
  }, [userId, clubId]);

  const feeRequirementMap = React.useMemo(() => {
    return Object.fromEntries(feeRequirements.map(f => [f.requirement_id, f]));
  }, [feeRequirements]);

  // Only show the latest transaction per (user_id, requirement_id)
  const latestTxns = React.useMemo(() => {
    const map = new Map<string, Transaction>();
    transactions.forEach(t => {
      const key = `${t.user_id || userId}-${t.requirement_id}`;
      if (!map.has(key) || t.transaction_id > map.get(key)!.transaction_id) {
        map.set(key, t);
      }
    });
    return Array.from(map.values());
  }, [transactions, userId]);

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col sm:ml-64">
        {/* Header */}
        <header className="relative flex items-center justify-center bg-gray-800 px-4 py-4 border-b border-gray-700">
          <h1 className="mx-auto text-xl font-semibold text-white">
            Welcome, {userName}
          </h1>
        </header>
        {/* Main Content */}
        <main className="p-4 flex-1 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payments Card */}
            <div className="bg-gray-800 rounded-lg shadow p-4">
              <h2 className="text-lg font-bold mb-4 text-primary-400">My Payments</h2>
              {loading ? (
                <div className="text-gray-400">Loading...</div>
              ) : latestTxns.length === 0 ? (
                <div className="text-gray-400">No payments found.</div>
              ) : (
                <div className="flex flex-col space-y-8">
                  {latestTxns.map((tx, idx) => {
                    const req = feeRequirementMap[tx.requirement_id];
                    const amountPaid = typeof tx.amount_paid === 'number' ? tx.amount_paid : parseFloat(tx.amount_paid as any) || 0;
                    const amountDue = req && req.amount_due != null && !isNaN(Number(req.amount_due)) ? Number(req.amount_due) : 0;
                    return (
                      <React.Fragment key={tx.transaction_id}>
                        <img
                          src={req?.req_picture || placeholderImage}
                          alt={req?.title || 'Fee'}
                          className="w-full h-48 object-cover rounded mb-0"
                        />
                        <div className="mb-2">
                          <div className="font-bold text-lg text-primary-300 mb-1">{req?.title || '—'}</div>
                          <div className="text-s text-gray-400 mb-1">
                            Due: {req?.end_datetime ? new Date(req.end_datetime.replace(' ', 'T')).toLocaleDateString() : req?.start_datetime ? new Date(req.start_datetime.replace(' ', 'T')).toLocaleDateString() : ''}
                          </div>
                          <div className="text-xs text-gray-400 mb-1">{tx.description}</div>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center mb-2">
                          <span className={`capitalize px-2 py-1 rounded font-semibold text-xs mr-2 ${
                            tx.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                            tx.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {tx.payment_status}
                          </span>
                          <span className="text-gray-400">Paid: <span className="font-bold text-white">₱{amountPaid.toFixed(2)}</span></span>
                          <span className="text-gray-400">Amount Due: <span className="font-bold text-white">₱{amountDue.toFixed(2)}</span></span>
                        </div>
                        {idx !== latestTxns.length - 1 && <hr className="my-4 border-gray-700" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Events Card */}
            <div className="bg-gray-800 rounded-lg shadow p-4">
              <h2 className="text-lg font-bold mb-4 text-primary-400">Upcoming Events</h2>
              {loading ? (
                <div className="text-gray-400">Loading...</div>
              ) : eventRequirements.length === 0 ? (
                <div className="text-gray-400">No upcoming events.</div>
              ) : (
                <ul className="divide-y divide-gray-700">
                  {eventRequirements.map(ev => (
                    <li key={ev.requirement_id} className="py-3 flex items-center space-x-3">
                      <img
                        src={ev.req_picture || placeholderImage}
                        alt={ev.title}
                        className="w-10 h-10 rounded object-cover"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{ev.title}</div>
                        <div className="text-xs text-gray-400">{ev.start_datetime ? `Start: ${new Date(ev.start_datetime.replace(' ', 'T')).toLocaleString()}` : ''}</div>
                        <div className="text-xs text-gray-400">{ev.end_datetime ? `End: ${new Date(ev.end_datetime.replace(' ', 'T')).toLocaleString()}` : ''}</div>
                        <div className="text-sm text-gray-300 mt-1">{ev.description}</div>
                        {ev.location && <div className="text-xs text-gray-400">Location: {ev.location}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MemberDashboard; 