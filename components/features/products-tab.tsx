'use client';

import { useState, useEffect, useMemo } from 'react';
import ProductCard from '../product-card';
import CreateProductModal from '../create-product-modal';
import ProductElementsModal from '../product-elements-modal';
import type { ProductResponse, RawMaterialResponse } from '../../types/ipc';

export default function ProductsTab() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [elementsModal, setElementsModal] = useState<{ productId: string; productName: string } | null>(null);
  const [editProductModal, setEditProductModal] = useState<ProductResponse | null>(null);
  const [cloneProductModal, setCloneProductModal] = useState<ProductResponse | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['All', ...Array.from(cats).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (activeCategory !== 'All') {
      filtered = filtered.filter(p => p.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(p =>
        p.serialNumber.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [products, activeCategory, search]);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    if (!window.electron) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const result = await window.electron.getProducts();
      if (result.success) setProducts(result.data);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleProductCreated(product: { id: string; serialNumber: string; category: string }) {
    setShowCreateProduct(false);
    setElementsModal({ productId: product.id, productName: product.serialNumber });
  }

  function handleElementsDone() {
    setElementsModal(null);
    loadProducts();
  }

  async function handleDeleteProduct(id: string) {
    if (!window.electron) return;
    try {
      const result = await window.electron.deleteProduct(id);
      if (result.success) {
        setProducts(prev => prev.filter(p => p.id !== id));
      } else {
        console.error('Failed to delete product:', result.error);
      }
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Toolbar: Category tabs + Search + Add button */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code..."
              className="w-56 rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <button
            onClick={() => setShowCreateProduct(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Product
          </button>
        </div>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading products...</div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <svg xmlns="http://www.w3.org/2000/svg" className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {products.length === 0 ? 'No products yet' : 'No products match your filter'}
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            {products.length === 0 ? 'Click "Add Product" to create your first product.' : 'Try a different category or search term.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onDelete={handleDeleteProduct}
              onEdit={(p) => setEditProductModal(p)}
              onClone={(p) => setCloneProductModal(p)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateProductModal
        isOpen={showCreateProduct}
        onClose={() => setShowCreateProduct(false)}
        onCreated={handleProductCreated}
        existingCategories={[...new Set(products.map(p => p.category))].sort()}
      />

      <ProductElementsModal
        isOpen={!!elementsModal}
        productId={elementsModal?.productId || null}
        productName={elementsModal?.productName || ''}
        onClose={() => { setElementsModal(null); loadProducts(); }}
        onDone={handleElementsDone}
      />

      {editProductModal && (
        <EditProductModal
          product={editProductModal}
          onClose={() => setEditProductModal(null)}
          onSaved={() => { setEditProductModal(null); loadProducts(); }}
          onEditElements={() => {
            const p = editProductModal;
            setEditProductModal(null);
            setElementsModal({ productId: p.id, productName: p.serialNumber });
          }}
        />
      )}

      {cloneProductModal && (
        <CloneProductModal
          product={cloneProductModal}
          onClose={() => setCloneProductModal(null)}
          onCloned={() => { setCloneProductModal(null); loadProducts(); }}
        />
      )}
    </div>
  );
}

// ── Edit Product Modal ──────────────────────────────────────

function EditProductModal({
  product,
  onClose,
  onSaved,
  onEditElements,
}: {
  product: ProductResponse;
  onClose: () => void;
  onSaved: () => void;
  onEditElements: () => void;
}) {
  const [form, setForm] = useState({
    serialNumber: product.serialNumber,
    category: product.category,
    label: product.label || '',
    unitsPerBox: product.unitsPerBox,
    imageUrl: product.imageUrl || '',
    boxRawMaterialId: product.boxRawMaterialId || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableMaterials, setAvailableMaterials] = useState<RawMaterialResponse[]>([]);

  useEffect(() => {
    if (window.electron) {
      window.electron.getRawMaterials().then(r => {
        if (r.success) setAvailableMaterials(r.data);
      });
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!window.electron) return;
    setIsSubmitting(true);
    try {
      const result = await window.electron.updateProduct(product.id, {
        serialNumber: form.serialNumber,
        category: form.category,
        label: form.label,
        unitsPerBox: Number(form.unitsPerBox),
        imageUrl: form.imageUrl || undefined,
        boxRawMaterialId: form.boxRawMaterialId || null,
      });
      if (result.success) {
        onSaved();
      } else {
        alert(result.error || 'Failed to update product');
      }
    } catch {
      alert('Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSelectImage() {
    if (!window.electron) return;
    try {
      const result = await window.electron.selectImage();
      if (result.success && result.data) {
        setForm(prev => ({ ...prev, imageUrl: result.data! }));
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900" onClick={e => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">Edit Product</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={form.serialNumber} onChange={(e) => setForm(prev => ({ ...prev, serialNumber: e.target.value }))} placeholder="Serial Number" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
          <input type="text" value={form.label} onChange={(e) => setForm(prev => ({ ...prev, label: e.target.value }))} placeholder="Label (optional)" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
          <input type="text" value={form.category} onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))} placeholder="Category" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
          <input type="number" value={form.unitsPerBox} onChange={(e) => setForm(prev => ({ ...prev, unitsPerBox: Number(e.target.value) }))} placeholder="Units per Box" min="1" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
          <button type="button" onClick={handleSelectImage} className="w-full rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700">
            {form.imageUrl ? 'Change Image' : 'Select Image'}
          </button>
          {form.imageUrl && (
            <div className="flex justify-center">
              <img src={form.imageUrl} alt="Preview" className="h-20 w-20 rounded-lg object-contain bg-zinc-100 dark:bg-zinc-800" />
            </div>
          )}
          {availableMaterials.length > 0 && (
            <div>
              <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">Box Type (for assembly deduction)</label>
              <select value={form.boxRawMaterialId} onChange={(e) => setForm(prev => ({ ...prev, boxRawMaterialId: e.target.value }))} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                <option value="">None (no box deduction)</option>
                {availableMaterials.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.stockQty.toLocaleString()} {m.unit})</option>
                ))}
              </select>
            </div>
          )}
          <button type="button" onClick={onEditElements} className="w-full rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-950/50 flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Edit Elements ({product.productElements?.length || 0})
          </button>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={isSubmitting || !form.serialNumber || !form.category} className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Clone Product Modal ─────────────────────────────────────

function CloneProductModal({
  product,
  onClose,
  onCloned,
}: {
  product: ProductResponse;
  onClose: () => void;
  onCloned: () => void;
}) {
  const [newSerialNumber, setNewSerialNumber] = useState(product.serialNumber + '-COPY');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!window.electron) return;
    setIsSubmitting(true);
    try {
      const result = await window.electron.cloneProduct({ sourceProductId: product.id, newSerialNumber });
      if (result.success) {
        onCloned();
      } else {
        alert(result.error || 'Failed to clone product');
      }
    } catch {
      alert('Failed to clone product');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900" onClick={e => e.stopPropagation()}>
        <h2 className="mb-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">Clone Product</h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Create a copy of <span className="font-semibold text-zinc-700 dark:text-zinc-300">{product.serialNumber}</span> with all its elements.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={newSerialNumber} onChange={(e) => setNewSerialNumber(e.target.value)} placeholder="New Serial Number" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={isSubmitting || !newSerialNumber} className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
              {isSubmitting ? 'Cloning...' : 'Clone Product'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
