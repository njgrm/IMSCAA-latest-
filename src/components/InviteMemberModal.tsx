import { useState } from 'react';
import { Modal } from 'flowbite-react';
import { toast } from 'react-toastify';

export default function InviteMemberModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [schoolId, setSchoolId] = useState('');
  const [email, setEmail] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const close = () => { setSchoolId(''); setEmail(''); setLink(''); onClose(); };
  const create = async () => {
    setBusy(true);
    try {
      const response = await fetch('/my-app-server/create_member_invite.php', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ school_id: schoolId, email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Invitation failed');
      setLink(new URL(data.link, window.location.origin).toString());
      toast.success('Member invitation created.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Invitation failed'); }
    finally { setBusy(false); }
  };
  return (
    <Modal dismissible show={open} onClose={close}>
      <Modal.Header>Invite member</Modal.Header>
      <Modal.Body><div className="space-y-4"><p className="text-sm text-gray-600 dark:text-gray-300">The registration link is valid for this School ID and email only.</p><label className="block text-sm font-medium">School ID<input value={schoolId} onChange={event => setSchoolId(event.target.value)} className="mt-1 w-full rounded border p-2.5 dark:bg-gray-700" required /></label><label className="block text-sm font-medium">Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full rounded border p-2.5 dark:bg-gray-700" required /></label>{link && <div className="rounded border border-primary-500 p-3"><label className="text-sm font-medium">Registration link<input readOnly value={link} className="mt-1 w-full rounded border p-2 text-gray-900" /></label><button type="button" onClick={() => void navigator.clipboard.writeText(link)} className="mt-2 rounded bg-primary-600 px-3 py-2 text-white">Copy</button></div>}</div></Modal.Body>
      <Modal.Footer><button disabled={busy || !schoolId.trim() || !email.trim() || Boolean(link)} onClick={() => void create()} className="rounded bg-primary-600 px-4 py-2 text-white disabled:opacity-50">{busy ? 'Creating...' : 'Create invitation'}</button><button onClick={close} className="rounded border px-4 py-2">Close</button></Modal.Footer>
    </Modal>
  );
}
