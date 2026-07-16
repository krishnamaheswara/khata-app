import { useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';

const api = import.meta.env.VITE_API_URL || '/api';
const demoUsers = {
  'admin@khata.com': { password: 'admin123', role: 'admin', name: 'Admin User' },
  'employee@khata.com': { password: 'employee123', role: 'employee', name: 'Employee User' }
};

const styles = {
  app: { minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'Inter, Arial, sans-serif' },
  shell: { maxWidth: 1180, margin: '0 auto', padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 24 },
  nav: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  card: { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)', marginBottom: 20 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '10px 8px', borderBottom: '1px solid #f1f5f9' },
  input: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', marginBottom: 10 },
  button: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 14px', cursor: 'pointer' },
  secondaryButton: { background: '#e2e8f0', color: '#0f172a', border: 'none', borderRadius: 10, padding: '10px 14px', cursor: 'pointer' },
  muted: { color: '#64748b' },
  badge: { display: 'inline-block', padding: '4px 8px', borderRadius: 999, background: '#eff6ff', color: '#2563eb' }
};

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('admin@khata.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const user = demoUsers[email];
    if (user && user.password === password) {
      onLogin({ email, role: user.role, name: user.name });
    } else {
      setError('Use admin@khata.com / admin123 or employee@khata.com / employee123');
    }
  };

  return (
    <div style={{ ...styles.app, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...styles.card, width: '100%', maxWidth: 420 }}>
        <h2 style={{ marginTop: 0 }}>Kirana Khata Login</h2>
        <p style={{ ...styles.muted, marginTop: -6 }}>Admin and employee access for the MVP</p>
        <form onSubmit={handleSubmit}>
          <input style={styles.input} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input style={styles.input} placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button style={styles.button} type="submit">Login</button>
        </form>
        {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
      </div>
    </div>
  );
}

function Dashboard({ auth, onLogout }) {
  const [summary, setSummary] = useState({ credit_total: 0, debt_total: 0, payment_total: 0 });
  const [analytics, setAnalytics] = useState([]);
  const [entries, setEntries] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());
  const [reportMonth, setReportMonth] = useState('');
  const [form, setForm] = useState({ customerId: '', phone: '', amount: '', type: 'credit', entryDate: new Date().toISOString().slice(0, 10), notes: '' });
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editingEntryForm, setEditingEntryForm] = useState({ customerId: '', phone: '', amount: '', type: 'credit', entryDate: new Date().toISOString().slice(0, 10), notes: '' });
  const [message, setMessage] = useState('');

  const loadData = async () => {
    const [summaryRes, entriesRes, analyticsRes, customersRes] = await Promise.all([
      fetch(`${api}/summary`),
      fetch(`${api}/entries`),
      fetch(`${api}/analytics`),
      fetch(`${api}/customers`)
    ]);

    const summaryData = summaryRes.ok ? await summaryRes.json().catch(() => ({})) : {};
    const entriesData = entriesRes.ok ? await entriesRes.json().catch(() => []) : [];
    const analyticsData = analyticsRes.ok ? await analyticsRes.json().catch(() => []) : [];
    const customersData = customersRes.ok ? await customersRes.json().catch(() => []) : [];

    setSummary(summaryData);
    setEntries(Array.isArray(entriesData) ? entriesData : []);
    setAnalytics(Array.isArray(analyticsData) ? analyticsData : []);
    setCustomers(Array.isArray(customersData) ? customersData : []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredEntries = entries.filter((entry) => {
    const matchesMonth = filterMonth ? (entry.entry_date || '').startsWith(filterMonth) : true;
    const matchesCustomer = filterCustomer ? (entry.customer_name || '').toLowerCase().includes(filterCustomer.toLowerCase()) : true;
    return matchesMonth && matchesCustomer;
  });

  const reportEntries = entries.filter((entry) => {
    const entryYear = (entry.entry_date || '').slice(0, 4);
    const matchesYear = reportYear ? entryYear === reportYear : true;
    const matchesMonth = reportMonth ? (entry.entry_date || '').startsWith(`${reportYear}-${reportMonth.padStart(2, '0')}`) : true;
    return matchesYear && matchesMonth;
  });

  const reportSummary = {
    credit: reportEntries.filter((item) => item.type === 'credit').reduce((sum, item) => sum + Number(item.amount || 0), 0),
    debt: reportEntries.filter((item) => item.type === 'debt').reduce((sum, item) => sum + Number(item.amount || 0), 0),
    payment: reportEntries.filter((item) => item.type === 'payment').reduce((sum, item) => sum + Number(item.amount || 0), 0)
  };

  const exportReport = () => {
    const csv = ['type,customer,amount,date,notes', ...reportEntries.map((item) => `${item.type},${(item.customer_name || item.customer || '').replace(/,/g, ' ')},${item.amount},${item.entry_date || ''},${(item.notes || '').replace(/,/g, ' ')}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `khata-report-${reportYear}${reportMonth ? `-${reportMonth}` : ''}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedCustomer = customers.find((customer) => String(customer.id) === String(form.customerId));
    const payload = {
      customerId: form.customerId || null,
      customerName: selectedCustomer?.name || '',
      phone: form.phone,
      amount: form.amount,
      type: form.type,
      entryDate: form.entryDate,
      notes: form.notes
    };

    const res = await fetch(`${api}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      await loadData();
      setMessage(`Saved ${selectedCustomer?.name || 'customer'} ${form.type}`);
      setForm({ customerId: '', phone: '', amount: '', type: 'credit', entryDate: new Date().toISOString().slice(0, 10), notes: '' });
    } else {
      const errorData = await res.json().catch(() => ({}));
      setMessage(errorData.message || 'Unable to save entry');
    }
  };

  const handleEditEntry = (entry) => {
    setEditingEntryId(entry.id);
    setEditingEntryForm({
      customerId: entry.customer_id || '',
      phone: entry.phone || '',
      amount: entry.amount,
      type: entry.type,
      entryDate: entry.entry_date,
      notes: entry.notes || ''
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const selectedCustomer = customers.find((customer) => String(customer.id) === String(editingEntryForm.customerId));
    const payload = {
      customerId: editingEntryForm.customerId || null,
      customerName: selectedCustomer?.name || '',
      phone: editingEntryForm.phone,
      amount: editingEntryForm.amount,
      type: editingEntryForm.type,
      entryDate: editingEntryForm.entryDate,
      notes: editingEntryForm.notes
    };

    const res = await fetch(`${api}/entries/${editingEntryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      await loadData();
      setEditingEntryId(null);
      setEditingEntryForm({ customerId: '', phone: '', amount: '', type: 'credit', entryDate: new Date().toISOString().slice(0, 10), notes: '' });
      setMessage('Entry updated');
    } else {
      const errorData = await res.json().catch(() => ({}));
      setMessage(errorData.message || 'Unable to update entry');
    }
  };

  return (
    <div style={styles.app}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <div>
            <h1 style={{ margin: 0 }}>Kirana Khata</h1>
            <p style={{ margin: '4px 0 0', ...styles.muted }}>Customer records, debt, paid amounts, and store registration</p>
          </div>
          <nav style={styles.nav}>
            <Link to="/" style={{ color: '#2563eb', textDecoration: 'none' }}>Dashboard</Link>
            <Link to="/customers" style={{ color: '#2563eb', textDecoration: 'none' }}>Customers</Link>
            <Link to="/stores" style={{ color: '#2563eb', textDecoration: 'none' }}>Stores</Link>
            <button type="button" style={styles.secondaryButton} onClick={onLogout}>Logout</button>
          </nav>
        </header>

        <section style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <h2 style={{ marginTop: 0 }}>MVP snapshot</h2>
              <p style={{ ...styles.muted, marginTop: -6 }}>Signed in as {auth?.name || 'User'} ({auth?.role || 'user'})</p>
            </div>
            <span style={styles.badge}>{auth?.role === 'admin' ? 'Admin access' : 'Employee access'}</span>
          </div>
          <div style={styles.grid}>
            <div><strong>Credit</strong><div style={{ fontSize: 28, marginTop: 6 }}>₹{Number(summary.credit_total || 0).toFixed(2)}</div></div>
            <div><strong>Debt</strong><div style={{ fontSize: 28, marginTop: 6 }}>₹{Number(summary.debt_total || 0).toFixed(2)}</div></div>
            <div><strong>Paid</strong><div style={{ fontSize: 28, marginTop: 6 }}>₹{Number(summary.payment_total || 0).toFixed(2)}</div></div>
            <div><strong>Customers</strong><div style={{ fontSize: 28, marginTop: 6 }}>{customers.length}</div></div>
          </div>
        </section>

        <section style={styles.card}>
          <h3 style={{ marginTop: 0 }}>New khata entry</h3>
          <form onSubmit={handleSubmit}>
            <select
              style={styles.input}
              value={form.customerId}
              onChange={(e) => {
                const selectedCustomer = customers.find((customer) => String(customer.id) === String(e.target.value));
                setForm({
                  ...form,
                  customerId: e.target.value,
                  phone: selectedCustomer?.phone || form.phone
                });
              }}
            >
              <option value="">Select existing customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
            <input style={styles.input} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input style={styles.input} placeholder="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            <select style={styles.input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="credit">Credit</option>
              <option value="debt">Debt</option>
              <option value="payment">Payment</option>
            </select>
            <input style={styles.input} type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} />
            <input style={styles.input} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <button style={styles.button} type="submit">Save entry</button>
          </form>
          {message ? <p style={{ color: '#0f766e' }}>{message}</p> : null}
        </section>

        <section style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Monthly analytics</h3>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Month</th><th style={styles.th}>Credit</th><th style={styles.th}>Debt</th><th style={styles.th}>Paid</th></tr></thead>
            <tbody>
              {analytics.map((row) => (
                <tr key={row.month}><td style={styles.td}>{row.month}</td><td style={styles.td}>₹{Number(row.credit_total || 0).toFixed(2)}</td><td style={styles.td}>₹{Number(row.debt_total || 0).toFixed(2)}</td><td style={styles.td}>₹{Number(row.payment_total || 0).toFixed(2)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        {editingEntryId ? (
          <section style={styles.card}>
            <h3 style={{ marginTop: 0 }}>Edit entry</h3>
            <form onSubmit={handleEditSubmit}>
              <select
                style={styles.input}
                value={editingEntryForm.customerId}
                onChange={(e) => {
                  const selectedCustomer = customers.find((customer) => String(customer.id) === String(e.target.value));
                  setEditingEntryForm({
                    ...editingEntryForm,
                    customerId: e.target.value,
                    phone: selectedCustomer?.phone || editingEntryForm.phone
                  });
                }}
              >
                <option value="">Select existing customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
              <input style={styles.input} placeholder="Phone" value={editingEntryForm.phone} onChange={(e) => setEditingEntryForm({ ...editingEntryForm, phone: e.target.value })} />
              <input style={styles.input} placeholder="Amount" type="number" value={editingEntryForm.amount} onChange={(e) => setEditingEntryForm({ ...editingEntryForm, amount: e.target.value })} required />
              <select style={styles.input} value={editingEntryForm.type} onChange={(e) => setEditingEntryForm({ ...editingEntryForm, type: e.target.value })}>
                <option value="credit">Credit</option>
                <option value="debt">Debt</option>
                <option value="payment">Payment</option>
              </select>
              <input style={styles.input} type="date" value={editingEntryForm.entryDate} onChange={(e) => setEditingEntryForm({ ...editingEntryForm, entryDate: e.target.value })} />
              <input style={styles.input} placeholder="Notes" value={editingEntryForm.notes} onChange={(e) => setEditingEntryForm({ ...editingEntryForm, notes: e.target.value })} />
              <button style={styles.button} type="submit">Save changes</button>
              <button type="button" style={{ ...styles.secondaryButton, marginLeft: 10 }} onClick={() => { setEditingEntryId(null); setEditingEntryForm({ customerId: '', phone: '', amount: '', type: 'credit', entryDate: new Date().toISOString().slice(0, 10), notes: '' }); }}>Cancel</button>
            </form>
          </section>
        ) : null}

        <section style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Recent khata entries</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 }}>
            <input style={styles.input} placeholder="Filter by month (YYYY-MM)" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
            <input style={styles.input} placeholder="Filter by customer" value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} />
          </div>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Customer</th><th style={styles.th}>Phone</th><th style={styles.th}>Type</th><th style={styles.th}>Amount</th><th style={styles.th}>Date</th><th style={styles.th}>Action</th></tr></thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id}><td style={styles.td}>{entry.customer_name || entry.customer || ''}</td><td style={styles.td}>{entry.phone}</td><td style={styles.td}>{entry.type}</td><td style={styles.td}>₹{Number(entry.amount).toFixed(2)}</td><td style={styles.td}>{entry.entry_date}</td><td style={styles.td}><button type="button" style={styles.secondaryButton} onClick={() => handleEditEntry(entry)}>Edit</button></td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function Customers({ auth, onLogout }) {
  const [customers, setCustomers] = useState([]);
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '', address: '', storeId: '' });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');

  const loadCustomers = async () => {
    const params = new URLSearchParams();
    if (filterMonth) params.set('month', filterMonth);
    if (filterYear) params.set('year', filterYear);

    const res = await fetch(`${api}/customers${params.toString() ? `?${params.toString()}` : ''}`);
    const data = res.ok ? await res.json().catch(() => []) : [];
    setCustomers(Array.isArray(data) ? data : []);
  };

  const loadStores = async () => {
    const res = await fetch(`${api}/stores`);
    const data = res.ok ? await res.json().catch(() => []) : [];
    setStores(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadCustomers();
    loadStores();
  }, [filterMonth, filterYear]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${api}/customers/${editingId}` : `${api}/customers`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, storeId: form.storeId || null })
    });

    if (res.ok) {
      await loadCustomers();
      setForm({ name: '', phone: '', address: '', storeId: '' });
      setEditingId(null);
      setMessage(editingId ? 'Customer updated' : 'Customer registered');
    } else {
      setMessage('Unable to save customer');
    }
  };

  const monthOptions = [
    { label: 'All months', value: '' },
    ...Array.from({ length: 12 }, (_, index) => ({
      label: new Date(2020, index, 1).toLocaleString('en', { month: 'long' }),
      value: String(index + 1).padStart(2, '0')
    }))
  ];

  const yearOptions = Array.from({ length: 6 }, (_, index) => String(new Date().getFullYear() - index));

  return (
    <div style={styles.app}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <div><h1 style={{ margin: 0 }}>Customers</h1><p style={{ margin: '4px 0 0', ...styles.muted }}>Register and update customer profiles</p></div>
          <nav style={styles.nav}><Link to="/" style={{ color: '#2563eb', textDecoration: 'none' }}>Dashboard</Link><Link to="/stores" style={{ color: '#2563eb', textDecoration: 'none' }}>Stores</Link><button type="button" style={styles.secondaryButton} onClick={onLogout}>Logout</button></nav>
        </header>
        <section style={styles.card}>
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Update customer' : 'Register customer'}</h3>
          <form onSubmit={handleSubmit}>
            <input style={styles.input} placeholder="Customer name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input style={styles.input} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input style={styles.input} placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <select style={styles.input} value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })}>
              <option value="">Select store</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
            <button style={styles.button} type="submit">{editingId ? 'Update' : 'Register'}</button>
            {editingId ? <button type="button" style={{ ...styles.secondaryButton, marginLeft: 10 }} onClick={() => { setEditingId(null); setForm({ name: '', phone: '', address: '', storeId: '' }); }}>Cancel</button> : null}
          </form>
          {message ? <p style={{ color: '#0f766e' }}>{message}</p> : null}
        </section>
        <section style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Customer balances</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#475569' }}>Month</label>
              <select style={styles.input} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                {monthOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#475569' }}>Year</label>
              <select style={styles.input} value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                <option value="">All years</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Name</th><th style={styles.th}>Store</th><th style={styles.th}>Phone</th><th style={styles.th}>Credit</th><th style={styles.th}>Debt</th><th style={styles.th}>Paid</th><th style={styles.th}>Balance</th><th style={styles.th}>Action</th></tr></thead>
            <tbody>
              {customers.map((customer) => {
                const balance = Number(customer.credit_total || 0) - Number(customer.debt_total || 0) - Number(customer.payment_total || 0);
                return (
                  <tr key={customer.id}>
                    <td style={styles.td}>{customer.name}</td>
                    <td style={styles.td}>{customer.store_name || '-'}</td>
                    <td style={styles.td}>{customer.phone}</td>
                    <td style={styles.td}>₹{Number(customer.credit_total || 0).toFixed(2)}</td>
                    <td style={styles.td}>₹{Number(customer.debt_total || 0).toFixed(2)}</td>
                    <td style={styles.td}>₹{Number(customer.payment_total || 0).toFixed(2)}</td>
                    <td style={styles.td}>₹{balance.toFixed(2)}</td>
                    <td style={styles.td}><button type="button" style={styles.secondaryButton} onClick={() => { setEditingId(customer.id); setForm({ name: customer.name, phone: customer.phone || '', address: customer.address || '', storeId: customer.store_id || '' }); }}>Edit</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function Stores({ auth, onLogout }) {
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState({ name: '', owner: '', phone: '', address: '' });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');

  const loadStores = async () => {
    const res = await fetch(`${api}/stores`);
    const data = res.ok ? await res.json().catch(() => []) : [];
    setStores(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadStores();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${api}/stores/${editingId}` : `${api}/stores`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    if (res.ok) {
      await loadStores();
      setForm({ name: '', owner: '', phone: '', address: '' });
      setEditingId(null);
      setMessage(editingId ? 'Store updated' : 'Store registered');
    } else {
      setMessage('Unable to save store');
    }
  };

  return (
    <div style={styles.app}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <div><h1 style={{ margin: 0 }}>Stores</h1><p style={{ margin: '4px 0 0', ...styles.muted }}>Register and update shop/store profiles</p></div>
          <nav style={styles.nav}><Link to="/" style={{ color: '#2563eb', textDecoration: 'none' }}>Dashboard</Link><Link to="/customers" style={{ color: '#2563eb', textDecoration: 'none' }}>Customers</Link><button type="button" style={styles.secondaryButton} onClick={onLogout}>Logout</button></nav>
        </header>
        <section style={styles.card}>
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Update store' : 'Register store'}</h3>
          <form onSubmit={handleSubmit}>
            <input style={styles.input} placeholder="Store name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input style={styles.input} placeholder="Owner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
            <input style={styles.input} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input style={styles.input} placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <button style={styles.button} type="submit">{editingId ? 'Update' : 'Register'}</button>
            {editingId ? <button type="button" style={{ ...styles.secondaryButton, marginLeft: 10 }} onClick={() => { setEditingId(null); setForm({ name: '', owner: '', phone: '', address: '' }); }}>Cancel</button> : null}
          </form>
          {message ? <p style={{ color: '#0f766e' }}>{message}</p> : null}
        </section>
        <section style={styles.card}>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Store</th><th style={styles.th}>Owner</th><th style={styles.th}>Phone</th><th style={styles.th}>Address</th><th style={styles.th}>Action</th></tr></thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id}>
                  <td style={styles.td}>{store.name}</td>
                  <td style={styles.td}>{store.owner}</td>
                  <td style={styles.td}>{store.phone}</td>
                  <td style={styles.td}>{store.address}</td>
                  <td style={styles.td}><button type="button" style={styles.secondaryButton} onClick={() => { setEditingId(store.id); setForm({ name: store.name, owner: store.owner || '', phone: store.phone || '', address: store.address || '' }); }}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem('khata-auth');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (user) => {
    setAuth(user);
    localStorage.setItem('khata-auth', JSON.stringify(user));
  };

  const handleLogout = () => {
    setAuth(null);
    localStorage.removeItem('khata-auth');
  };

  if (!auth) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard auth={auth} onLogout={handleLogout} />} />
      <Route path="/customers" element={<Customers auth={auth} onLogout={handleLogout} />} />
      <Route path="/stores" element={<Stores auth={auth} onLogout={handleLogout} />} />
    </Routes>
  );
}
