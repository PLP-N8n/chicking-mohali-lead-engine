'use client';
import { useMemo, useState } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel,
  flexRender, type ColumnDef, type SortingState,
} from '@tanstack/react-table';
import { NotePencil, Phone, CaretUp, CaretDown, Funnel, Warning, ArrowClockwise } from '@phosphor-icons/react';
import NotesModal from './NotesModal';
import type { Lead } from '@/lib/api';

const STATUS_COLOR: Record<string, string> = {
  new:        '#2563eb',
  contacted:  '#d97706',
  qualified:  '#16a34a',
  dropped:    '#6b7280',
};

function Badge({ type }: { type: string }) {
  return (
    <span style={{
      background: type === 'b2b' ? '#fff4f4' : '#eff6ff',
      color:      type === 'b2b' ? '#C8102E'  : '#1d4ed8',
      border:     `1px solid ${type === 'b2b' ? '#fecaca' : '#bfdbfe'}`,
      borderRadius: 9999, padding: '.2rem .6rem',
      fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase' as const,
    }}>{type}</span>
  );
}

function StatusDot({ status }: { status: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', fontSize: '.82rem', fontWeight: 500, color: STATUS_COLOR[status] ?? '#6b7280' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLOR[status] ?? '#6b7280', display: 'inline-block' }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

interface LeadsTableProps {
  leads: Lead[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onUpdated?: (id: string, status: Lead['status'], notes: string) => void;
}

export default function LeadsTable({ leads, loading, error, onRefresh, onUpdated }: LeadsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'b2c' | 'b2b'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Lead['status']>('all');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const columns = useMemo<ColumnDef<Lead>[]>(() => [
    {
      accessorKey: 'created_at',
      header: 'Date',
      cell: ({ getValue }) => new Date(getValue<number>() * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => <Badge type={getValue<string>()} />,
    },
    { accessorKey: 'name', header: 'Name' },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ getValue }) => (
        <a href={`tel:+91${getValue<string>()}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', color: '#374151', textDecoration: 'none' }}>
          <Phone size={14} /> {getValue<string>()}
        </a>
      ),
    },
    {
      accessorKey: 'city',
      header: 'City',
      cell: ({ getValue }) => getValue<string>() ?? <span style={{ color: '#d1d5db' }}>—</span>,
    },
    {
      accessorKey: 'investment',
      header: 'Investment',
      cell: ({ getValue }) => getValue<string>() ?? <span style={{ color: '#d1d5db' }}>—</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusDot status={getValue<string>()} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={() => setEditingLead(row.original)}
          style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '.3rem .5rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: '.8rem', color: '#374151' }}
          title="Edit notes / status"
        >
          <NotePencil size={14} /> Edit
        </button>
      ),
    },
  ], []);

  const filteredData = useMemo(() => {
    let rows = leads;
    if (typeFilter !== 'all') rows = rows.filter(l => l.type === typeFilter);
    if (statusFilter !== 'all') rows = rows.filter(l => l.status === statusFilter);
    return rows;
  }, [leads, typeFilter, statusFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  const handleSaved = (id: string, status: string, notes: string) => {
    onUpdated?.(id, status as Lead['status'], notes);
    setEditingLead(null);
  };

  const cellStyle: React.CSSProperties = {
    padding: '.65rem .75rem', borderBottom: '1px solid #f3f4f6',
    fontSize: '.875rem', color: '#374151', whiteSpace: 'nowrap' as const,
  };

  const rowCount = table.getFilteredRowModel().rows.length;
  const totalCount = leads.length;

  return (
    <>
      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem', alignItems: 'center', marginBottom: '1rem' }}>
        <input
          type="search"
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          placeholder="Search name, phone, city…"
          style={{ padding: '.6rem .9rem', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '.9rem', width: '100%', maxWidth: 320 }}
        />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}>
          <Funnel size={14} color="#6b7280" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
            style={{ padding: '.55rem .75rem', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '.85rem', background: '#fff' }}
          >
            <option value="all">All types</option>
            <option value="b2c">B2C Waitlist</option>
            <option value="b2b">B2B Franchise</option>
          </select>
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          style={{ padding: '.55rem .75rem', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '.85rem', background: '#fff' }}
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="dropped">Dropped</option>
        </select>

        {(typeFilter !== 'all' || statusFilter !== 'all' || globalFilter) && (
          <button
            onClick={() => { setTypeFilter('all'); setStatusFilter('all'); setGlobalFilter(''); }}
            style={{ padding: '.55rem .75rem', border: '1.5px solid #e5e7eb', borderRadius: 8, background: '#fff', fontSize: '.85rem', color: '#374151', cursor: 'pointer' }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.85)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem', color: '#6b7280', fontSize: '.9rem' }}>
            <span className="spinner" style={{ width: 16, height: 16, border: '2px solid #e5e7eb', borderTopColor: '#C8102E', borderRadius: '50%' }} /> Loading leads…
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th
                    key={h.id}
                    onClick={h.column.getToggleSortingHandler()}
                    style={{
                      padding: '.65rem .75rem', textAlign: 'left',
                      fontSize: '.75rem', fontWeight: 700, color: '#6b7280',
                      textTransform: 'uppercase', letterSpacing: '.05em',
                      borderBottom: '2px solid #f3f4f6',
                      cursor: h.column.getCanSort() ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.2rem' }}>
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getIsSorted() === 'asc'  && <CaretUp size={12} />}
                      {h.column.getIsSorted() === 'desc' && <CaretDown size={12} />}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td colSpan={8} style={{ ...cellStyle, textAlign: 'center', color: '#b91c1c', padding: '3rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.75rem' }}>
                    <Warning size={28} />
                    <div>{error}</div>
                    {onRefresh && (
                      <button
                        onClick={onRefresh}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', padding: '.5rem .9rem', border: '1.5px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: '.85rem', fontWeight: 600 }}
                      >
                        <ArrowClockwise size={15} /> Retry
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : rowCount === 0 ? (
              <tr>
                <td colSpan={8} style={{ ...cellStyle, textAlign: 'center', color: '#9ca3af', padding: '3rem' }}>
                  {totalCount === 0 ? (
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginBottom: '.25rem' }}>No leads yet</div>
                      <div style={{ fontSize: '.85rem' }}>Leads captured from the landing page will appear here.</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginBottom: '.25rem' }}>No matches</div>
                      <div style={{ fontSize: '.85rem' }}>Try clearing your filters.</div>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} style={{ transition: 'background 100ms' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} style={cellStyle}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!error && rowCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '.75rem', fontSize: '.85rem', color: '#6b7280' }}>
          <span>{rowCount} lead{rowCount !== 1 ? 's' : ''}</span>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button
              onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
              style={{ padding: '.35rem .75rem', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: table.getCanPreviousPage() ? 'pointer' : 'not-allowed', opacity: table.getCanPreviousPage() ? 1 : .4 }}
            >← Prev</button>
            <span style={{ padding: '.35rem .5rem' }}>Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</span>
            <button
              onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
              style={{ padding: '.35rem .75rem', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: table.getCanNextPage() ? 'pointer' : 'not-allowed', opacity: table.getCanNextPage() ? 1 : .4 }}
            >Next →</button>
          </div>
        </div>
      )}

      {editingLead && (
        <NotesModal
          lead={editingLead}
          onClose={() => setEditingLead(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
