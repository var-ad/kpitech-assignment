import { useCallback, useEffect, useState } from 'react'
import apiClient from '../api/client'
import { parsePrice, Spin, getApiError } from './OrderTracker'
import { useToast } from '../context/ToastContext'

// ── Types ──

interface MenuItemData {
  id: number
  name: string
  description: string | null
  category: string
  price: string | number
  is_vegetarian: boolean
  is_spicy: boolean
  available: boolean
  created_at: string
  updated_at: string
}

type MenuFormData = {
  name: string
  category: string
  price: string
  description: string
  is_vegetarian: boolean
  is_spicy: boolean
  available: boolean
}

const EMPTY_FORM: MenuFormData = {
  name: '',
  category: '',
  price: '',
  description: '',
  is_vegetarian: false,
  is_spicy: false,
  available: true,
}

// ── Admin color tokens ──
const accent = '#D43B1F'
const accentHover = '#BA2E14'
const borderColor = '#E2DCD3'
const textMuted = '#7A6F62'
const rowHover = '#FAF8F6'
const headerBg = '#F7F5F3'

const cellStyle: React.CSSProperties = { padding: '12px 14px', alignSelf: 'center' }
const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
  fontSize: '0.8125rem', color: '#1A1410', fontFamily: 'DM Sans, sans-serif',
}

// ── Component ──

export default function MenuManagement() {
  const { toast } = useToast()
  const [items, setItems] = useState<MenuItemData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form modal
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null)
  const [formData, setFormData] = useState<MenuFormData>(EMPTY_FORM)
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Per-item action states
  const [togglingIds, setTogglingIds] = useState<Record<number, true>>({})
  const [deletingIds, setDeletingIds] = useState<Record<number, true>>({})

  // ── Fetch items ──

  const fetchItems = useCallback(() => {
    setLoading(true)
    setError(null)
    apiClient
      .get<MenuItemData[]>('/api/admin/menu-items')
      .then((res) => {
        setItems(res.data)
        setLoading(false)
      })
      .catch((err) => {
        setError(
          err.response?.status === 401
            ? 'Session expired. Please log in again.'
            : 'Failed to load menu items',
        )
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // ── Open create modal ──

  const handleOpenCreate = () => {
    setEditingItem(null)
    setFormData(EMPTY_FORM)
    setFormError(null)
    setFormOpen(true)
  }

  // ── Open edit modal ──

  const handleOpenEdit = (item: MenuItemData) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      category: item.category,
      price: String(parsePrice(item.price)),
      description: item.description || '',
      is_vegetarian: item.is_vegetarian,
      is_spicy: item.is_spicy,
      available: item.available,
    })
    setFormError(null)
    setFormOpen(true)
  }

  // ── Form submit ──

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) { setFormError('Name is required'); return }
    if (!formData.category.trim()) { setFormError('Category is required'); return }
    const priceNum = parseFloat(formData.price)
    if (isNaN(priceNum) || priceNum <= 0) { setFormError('Price must be a positive number'); return }

    setFormSaving(true)
    setFormError(null)
    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        price: priceNum,
        description: formData.description.trim() || null,
        is_vegetarian: formData.is_vegetarian,
        is_spicy: formData.is_spicy,
        available: formData.available,
      }
      if (editingItem) {
        await apiClient.put(`/api/admin/menu-items/${editingItem.id}`, payload)
      } else {
        await apiClient.post('/api/admin/menu-items', payload)
      }
      setFormOpen(false)
      fetchItems()
      toast(editingItem ? 'Item updated' : 'Item added', 'success')
    } catch (err: unknown) {
      setFormError(getApiError(err, 'Failed to save menu item'))
    } finally {
      setFormSaving(false)
    }
  }

  // ── Availability toggle ──

  const handleToggleAvailability = async (item: MenuItemData) => {
    setTogglingIds((prev) => ({ ...prev, [item.id]: true }))
    try {
      await apiClient.patch(`/api/admin/menu-items/${item.id}/availability`, { available: !item.available })
      fetchItems()
      toast(item.available ? 'Item marked unavailable' : 'Item marked available', 'success')
    } catch { toast('Failed to update availability', 'error') }
    finally {
      setTogglingIds((prev) => { const next = { ...prev }; delete next[item.id]; return next })
    }
  }

  // ── Soft delete ──

  const handleDelete = (item: MenuItemData) => {
    if (!window.confirm(`Delete "${item.name}"? This item will be hidden from customers but preserved in order history.`)) return
    setDeletingIds((prev) => ({ ...prev, [item.id]: true }))
    apiClient.delete(`/api/admin/menu-items/${item.id}`)
      .then(() => { fetchItems(); toast('Item deleted', 'success') })
      .catch(() => toast('Failed to delete menu item', 'error'))
      .finally(() => { setDeletingIds((prev) => { const next = { ...prev }; delete next[item.id]; return next }) })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1.5px solid',
    borderColor: '#D4CDC3',
    color: '#1A1410',
    fontSize: '0.8125rem',
    outline: 'none',
    fontFamily: 'DM Sans, sans-serif',
    backgroundColor: '#FFFFFF',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: textMuted,
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    fontFamily: 'DM Sans, sans-serif',
  }

  // ── Render ──

  if (loading) {
    return (
      <div className="animate-pulse" style={{ padding: '40px 0' }}>
        <div style={{ height: '12px', backgroundColor: '#EDE7DF', borderRadius: '4px', width: '200px', marginBottom: '20px' }} />
        <div style={{ height: '40px', backgroundColor: '#EDE7DF', borderRadius: '6px', width: '100%', marginBottom: '8px' }} />
        <div style={{ height: '40px', backgroundColor: '#F5F0EB', borderRadius: '6px', width: '100%', marginBottom: '8px' }} />
        <div style={{ height: '40px', backgroundColor: '#F5F0EB', borderRadius: '6px', width: '100%' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p style={{ color: accent, fontSize: '0.9rem', marginBottom: '8px' }}>{error}</p>
        <button onClick={fetchItems} style={{ color: accent, fontSize: '0.8125rem', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Retry</button>
      </div>
    )
  }

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontSize: '0.8125rem', color: textMuted, fontFamily: 'DM Sans, sans-serif' }}>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchItems} style={{ padding: '7px 14px', borderRadius: '6px', border: '1.5px solid', borderColor, backgroundColor: 'transparent', color: textMuted, fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.1s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.color = textMuted }}>
            ↻ Refresh
          </button>
          <button onClick={handleOpenCreate} style={{ padding: '7px 16px', borderRadius: '6px', border: 'none', backgroundColor: accent, color: '#FFFFFF', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'background-color 0.1s' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = accentHover }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = accent }}>
            + Add Item
          </button>
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ color: textMuted, fontSize: '0.9rem', marginBottom: '12px' }}>No menu items yet.</p>
          <button onClick={handleOpenCreate} style={{ padding: '8px 20px', borderRadius: '6px', border: '1.5px solid', borderColor: accent, color: accent, backgroundColor: 'transparent', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Add your first item</button>
        </div>
      ) : (
        /* ── Table ── */
        <div style={{ border: '1.5px solid', borderColor, borderRadius: '8px', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.6fr 1fr 0.7fr 1fr', backgroundColor: headerBg, borderBottom: '1.5px solid', borderColor }}>
            {['Name', 'Category', 'Price', 'Tags', 'Status', 'Actions'].map((h) => (
              <div key={h} style={{ padding: '10px 14px', fontSize: '0.6875rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'DM Sans, sans-serif' }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {items.map((item, idx) => {
            const isToggling = togglingIds[item.id]
            const isDeleting = deletingIds[item.id]
            return (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 0.8fr 0.6fr 1fr 0.7fr 1fr',
                  borderBottom: idx < items.length - 1 ? '1px solid #EDE7DF' : 'none',
                  backgroundColor: isDeleting ? '#FFF5F2' : '#FFFFFF',
                  transition: 'background-color 0.1s',
                  fontSize: '0.8125rem',
                }}
                onMouseEnter={(e) => { if (!isDeleting) e.currentTarget.style.backgroundColor = rowHover }}
                onMouseLeave={(e) => { if (!isDeleting) e.currentTarget.style.backgroundColor = '#FFFFFF' }}
              >
                {/* Name */}
                <div style={{ ...cellStyle, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontFamily: 'Sora, sans-serif', color: '#1A1410', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  {item.description && <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</div>}
                </div>

                {/* Category */}
                <div style={{ ...cellStyle, color: textMuted, fontFamily: 'DM Sans, sans-serif' }}>{item.category}</div>

                {/* Price */}
                <div style={{ ...cellStyle, fontWeight: 600, fontFamily: 'Sora, sans-serif', color: '#1A1410' }}>₹{parsePrice(item.price).toFixed(2)}</div>

                {/* Tags */}
                <div style={{ ...cellStyle, display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: item.is_vegetarian ? '#E8F5E9' : '#FFEBEE', color: item.is_vegetarian ? '#1A7A44' : '#C62828' }}>
                    {item.is_vegetarian ? 'Veg' : 'Non-Veg'}
                  </span>
                  {item.is_spicy && <span style={{ fontSize: '0.6875rem', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FFF7ED', color: '#D97706' }}>Spicy</span>}
                </div>

                {/* Status */}
                <div style={cellStyle}>
                  <span style={{ display: 'inline-block', fontSize: '0.6875rem', fontWeight: 600, padding: '3px 10px', borderRadius: '4px', backgroundColor: item.available ? '#E8F5E9' : '#FFEBEE', color: item.available ? '#1A7A44' : '#C62828' }}>
                    {item.available ? 'Available' : 'Unavail.'}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ ...cellStyle, display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button onClick={() => handleOpenEdit(item)} disabled={isDeleting}
                    style={{ padding: '6px 12px', borderRadius: '4px', border: '1.5px solid', borderColor: '#D4CDC3', backgroundColor: 'transparent', color: textMuted, fontSize: '0.75rem', fontWeight: 500, cursor: isDeleting ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.1s', opacity: isDeleting ? 0.5 : 1 }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#D4CDC3'; e.currentTarget.style.color = textMuted }}>
                    Edit
                  </button>
                  <button onClick={() => handleToggleAvailability(item)} disabled={isToggling || isDeleting}
                    style={{ padding: '6px 12px', borderRadius: '4px', border: '1.5px solid', borderColor: item.available ? '#FFCDD2' : '#C8E6C9', backgroundColor: 'transparent', color: item.available ? '#C62828' : '#1A7A44', fontSize: '0.75rem', fontWeight: 500, cursor: (isToggling || isDeleting) ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.1s', opacity: (isToggling || isDeleting) ? 0.5 : 1 }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = item.available ? '#FFEBEE' : '#E8F5E9' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
                    {isToggling ? '...' : item.available ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => handleDelete(item)} disabled={isDeleting}
                    style={{ padding: '6px 12px', borderRadius: '4px', border: '1.5px solid', borderColor: '#F5F0EB', backgroundColor: 'transparent', color: '#B0A89E', fontSize: '0.75rem', fontWeight: 500, cursor: isDeleting ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.1s', opacity: isDeleting ? 0.5 : 1 }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#C62828'; e.currentTarget.style.color = '#C62828' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#F5F0EB'; e.currentTarget.style.color = '#B0A89E' }}>
                    {isDeleting ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create/Edit Modal ── */}
      {formOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => !formSaving && setFormOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1.5px solid', borderColor, width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
              <form onSubmit={handleFormSubmit}>
                {/* Header — hairline ruler */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid', borderColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: headerBg }}>
                  <h2 style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'Sora, sans-serif', color: '#1A1410', margin: 0 }}>{editingItem ? 'Edit Item' : 'Add Item'}</h2>
                  <button type="button" onClick={() => !formSaving && setFormOpen(false)} style={{ color: textMuted, fontSize: '1.3rem', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>×</button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Name *</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
                      style={inputStyle} placeholder="Item name"
                      onFocus={(e) => { e.currentTarget.style.borderColor = accent }} onBlur={(e) => { e.currentTarget.style.borderColor = '#D4CDC3' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Category *</label>
                      <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required
                        style={inputStyle} placeholder="e.g. Main Course"
                        onFocus={(e) => { e.currentTarget.style.borderColor = accent }} onBlur={(e) => { e.currentTarget.style.borderColor = '#D4CDC3' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Price (₹) *</label>
                      <input type="number" step="0.01" min="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required
                        style={inputStyle} placeholder="250.00"
                        onFocus={(e) => { e.currentTarget.style.borderColor = accent }} onBlur={(e) => { e.currentTarget.style.borderColor = '#D4CDC3' }} />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2}
                      style={{ ...inputStyle, resize: 'none' }} placeholder="Brief description..."
                      onFocus={(e) => { e.currentTarget.style.borderColor = accent }} onBlur={(e) => { e.currentTarget.style.borderColor = '#D4CDC3' }} />
                  </div>

                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center', paddingTop: '4px' }}>
                    <label style={checkboxLabelStyle}>
                      <input type="checkbox" checked={formData.is_vegetarian} onChange={(e) => setFormData({ ...formData, is_vegetarian: e.target.checked })} style={{ width: '14px', height: '14px' }} /> Vegetarian
                    </label>
                    <label style={checkboxLabelStyle}>
                      <input type="checkbox" checked={formData.is_spicy} onChange={(e) => setFormData({ ...formData, is_spicy: e.target.checked })} style={{ width: '14px', height: '14px' }} /> Spicy
                    </label>
                    {editingItem && (
                      <label style={checkboxLabelStyle}>
                        <input type="checkbox" checked={formData.available} onChange={(e) => setFormData({ ...formData, available: e.target.checked })} style={{ width: '14px', height: '14px' }} /> Available
                      </label>
                    )}
                  </div>

                  {formError && <p style={{ fontSize: '0.8125rem', color: accent, margin: 0 }}>{formError}</p>}
                </div>

                {/* Footer */}
                <div style={{ padding: '14px 20px', borderTop: '1px solid', borderColor, display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: headerBg }}>
                  <button type="button" onClick={() => !formSaving && setFormOpen(false)} disabled={formSaving}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: '1.5px solid', borderColor: '#D4CDC3', backgroundColor: 'transparent', color: textMuted, fontSize: '0.8125rem', fontWeight: 500, cursor: formSaving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: formSaving ? 0.6 : 1 }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={formSaving}
                    style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', backgroundColor: formSaving ? textMuted : accent, color: '#FFFFFF', fontSize: '0.8125rem', fontWeight: 600, cursor: formSaving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background-color 0.1s' }}
                    onMouseEnter={(e) => { if (!formSaving) e.currentTarget.style.backgroundColor = accentHover }}
                    onMouseLeave={(e) => { if (!formSaving) e.currentTarget.style.backgroundColor = accent }}>
                    {formSaving && <Spin />}
                    {formSaving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
