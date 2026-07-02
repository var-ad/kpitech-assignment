import { useEffect, useState } from 'react'
import apiClient from '../api/client'
import MenuItemCard, { type MenuItemData } from './MenuItemCard'

export default function MenuBrowser() {
  const [items, setItems] = useState<MenuItemData[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get<MenuItemData[]>('/api/menu').then((res) => {
      setItems(res.data)
      setLoading(false)
    })
    apiClient.get<string[]>('/api/menu/categories').then((res) => {
      setCategories(res.data)
    })
  }, [])

  const filtered = activeCategory
    ? items.filter((i) => i.category === activeCategory)
    : items

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="animate-pulse" style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1.5px solid #E5DDD3', padding: '20px', height: '200px' }}>
            <div style={{ height: '14px', backgroundColor: '#F0EBE5', borderRadius: '6px', width: '40%', marginBottom: '12px' }} />
            <div style={{ height: '12px', backgroundColor: '#F5F0EB', borderRadius: '6px', width: '30%', marginBottom: '8px' }} />
            <div style={{ height: '20px', backgroundColor: '#F0EBE5', borderRadius: '6px', width: '70%', marginBottom: '16px' }} />
            <div style={{ height: '12px', backgroundColor: '#F5F0EB', borderRadius: '6px', width: '100%', marginBottom: '8px' }} />
            <div style={{ height: '12px', backgroundColor: '#F5F0EB', borderRadius: '6px', width: '80%', marginBottom: '20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ height: '24px', backgroundColor: '#F0EBE5', borderRadius: '6px', width: '60px' }} />
              <div style={{ height: '36px', backgroundColor: '#F0EBE5', borderRadius: '8px', width: '110px' }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const btnBase = (isActive: boolean) => ({
    padding: '8px 20px',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    border: '1.5px solid',
    borderColor: isActive ? '#D43B1F' : '#E5DDD3',
    backgroundColor: isActive ? '#D43B1F' : 'transparent',
    color: isActive ? '#FFFFFF' : '#5C4F42',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: 'DM Sans, sans-serif',
  })

  return (
    <div>
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCategory(null)}
          style={btnBase(activeCategory === null)}
          onMouseOver={(e) => {
            if (activeCategory !== null) {
              e.currentTarget.style.borderColor = '#D43B1F';
              e.currentTarget.style.color = '#D43B1F';
            }
          }}
          onMouseOut={(e) => {
            if (activeCategory !== null) {
              e.currentTarget.style.borderColor = '#E5DDD3';
              e.currentTarget.style.color = '#5C4F42';
            }
          }}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={btnBase(activeCategory === cat)}
            onMouseOver={(e) => {
              if (activeCategory !== cat) {
                e.currentTarget.style.borderColor = '#D43B1F';
                e.currentTarget.style.color = '#D43B1F';
              }
            }}
            onMouseOut={(e) => {
              if (activeCategory !== cat) {
                e.currentTarget.style.borderColor = '#E5DDD3';
                e.currentTarget.style.color = '#5C4F42';
              }
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🍽️</div>
          <p style={{ color: '#5C4F42', fontWeight: 500, fontSize: '1rem', marginBottom: '4px' }}>
            No items in this category
          </p>
          <p style={{ color: '#A09080', fontSize: '0.85rem', marginBottom: '16px' }}>
            {activeCategory ? `Try selecting a different category.` : 'Check back later for new additions.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <MenuItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
