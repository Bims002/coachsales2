"use client";

import { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Edit2, ShieldAlert, X, Save, Loader2, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface Product {
    id: string;
    name: string;
    description: string;
    objections: string[];
    difficulty: number;
    created_at: string;
}

export default function ProductsAdmin() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formObjections, setFormObjections] = useState('');
    const [formDifficulty, setFormDifficulty] = useState(3);

    const supabase = createClient();

    const fetchProducts = async () => {
        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (data) setProducts(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const resetForm = () => {
        setFormName('');
        setFormDescription('');
        setFormObjections('');
        setFormDifficulty(3);
        setEditingProduct(null);
        setShowForm(false);
    };

    const openEditForm = (product: Product) => {
        setEditingProduct(product);
        setFormName(product.name);
        setFormDescription(product.description || '');
        setFormObjections(product.objections?.join('\n') || '');
        setFormDifficulty(product.difficulty || 3);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const productData = {
            name: formName,
            description: formDescription,
            objections: formObjections.split('\n').filter(o => o.trim()),
            difficulty: formDifficulty,
        };

        if (editingProduct) {
            await supabase.from('products').update(productData).eq('id', editingProduct.id);
        } else {
            await supabase.from('products').insert(productData);
        }

        await fetchProducts();
        resetForm();
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Supprimer ce produit ?')) {
            await supabase.from('products').delete().eq('id', id);
            await fetchProducts();
        }
    };

    return (
        <div className="fluent-container">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: '#E8E0F5' }}
                        >
                            <Package className="w-5 h-5" style={{ color: '#8661C5' }} />
                        </div>
                        <h1>Produits & Scénarios</h1>
                    </div>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        Gérez les scripts de vente et le comportement de l'IA pour les simulations.
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="btn-primary w-fit"
                >
                    <Plus className="w-5 h-5" />
                    Nouveau Produit
                </button>
            </div>

            {/* Modal Form */}
            {showForm && (
                <div className="fluent-modal-overlay">
                    <div className="fluent-modal animate-in zoom-in-95 duration-200" style={{ maxWidth: '600px' }}>
                        <div className="fluent-modal-header">
                            <h2 style={{ fontSize: '1.25rem' }}>
                                {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
                            </h2>
                            <button
                                onClick={resetForm}
                                className="p-2 hover:bg-[var(--color-gray-20)] rounded-lg"
                            >
                                <X className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="fluent-modal-body space-y-5">
                                <div>
                                    <label className="fluent-label">Nom du produit</label>
                                    <input
                                        type="text"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        className="fluent-input"
                                        placeholder="Forfait Mobile Pro"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="fluent-label">Description</label>
                                    <textarea
                                        value={formDescription}
                                        onChange={(e) => setFormDescription(e.target.value)}
                                        className="fluent-input"
                                        rows={3}
                                        placeholder="Offre mobile avec appels illimités..."
                                        style={{ resize: 'none' }}
                                    />
                                </div>

                                <div>
                                    <label className="fluent-label">Objections (une par ligne)</label>
                                    <textarea
                                        value={formObjections}
                                        onChange={(e) => setFormObjections(e.target.value)}
                                        className="fluent-input"
                                        rows={4}
                                        placeholder="C'est trop cher&#10;Je vais réfléchir&#10;Je suis déjà engagé ailleurs"
                                        style={{
                                            resize: 'none',
                                            fontFamily: 'monospace',
                                            fontSize: '0.875rem'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label className="fluent-label flex justify-between">
                                        <span>Difficulté</span>
                                        <span style={{ color: '#8661C5', fontWeight: 'bold' }}>{formDifficulty}/5</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        value={formDifficulty}
                                        onChange={(e) => setFormDifficulty(parseInt(e.target.value))}
                                        className="w-full"
                                        style={{ accentColor: '#8661C5' }}
                                    />
                                    <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                        <span>Facile</span>
                                        <span>Difficile</span>
                                    </div>
                                </div>

                            </div>

                            <div className="fluent-modal-footer gap-3">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="btn-ghost flex-1"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-primary flex-1"
                                >
                                    {saving ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            {editingProduct ? 'Enregistrer' : 'Créer'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--color-secondary)' }} />
                </div>
            ) : products.length === 0 ? (
                <div className="fluent-card text-center" style={{ padding: '64px' }}>
                    <Package className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--color-text-disabled)' }} />
                    <h3 className="mb-2">Aucun produit</h3>
                    <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                        Créez votre premier scénario de vente pour commencer.
                    </p>
                    <button onClick={() => setShowForm(true)} className="btn-primary">
                        <Plus className="w-5 h-5" /> Créer un produit
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {products.map((product) => (
                        <div key={product.id} className="fluent-card group transition-all hover:shadow-lg">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="mb-1 text-xl">{product.name}</h3>
                                    <span
                                        className="fluent-badge"
                                        style={{
                                            backgroundColor: '#E8E0F5',
                                            color: '#8661C5',
                                            fontSize: '0.7rem'
                                        }}
                                    >
                                        DIFFICULTÉ {product.difficulty || 3}/5
                                    </span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => openEditForm(product)}
                                        className="p-2 hover:bg-[var(--color-gray-10)] rounded-lg transition-colors"
                                        style={{ color: 'var(--color-text-secondary)' }}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(product.id)}
                                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                        style={{ color: 'var(--color-error)' }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <p
                                className="text-sm line-clamp-2 mb-6"
                                style={{ color: 'var(--color-text-secondary)', minHeight: '40px' }}
                            >
                                {product.description}
                            </p>

                            {product.objections && product.objections.length > 0 && (
                                <div>
                                    <p
                                        className="text-[10px] font-black uppercase tracking-wider mb-2"
                                        style={{ color: 'var(--color-text-disabled)' }}
                                    >
                                        Objections configurées
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {product.objections.slice(0, 3).map((obj: string, i: number) => (
                                            <span
                                                key={i}
                                                className="fluent-badge"
                                                style={{ fontSize: '0.75rem' }}
                                            >
                                                {obj}
                                            </span>
                                        ))}
                                        {product.objections.length > 3 && (
                                            <span
                                                className="text-[10px] mt-1"
                                                style={{ color: 'var(--color-text-disabled)' }}
                                            >
                                                +{product.objections.length - 3} autres
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Info Banner */}
            <div
                className="mt-12 p-6 rounded-lg flex gap-4 items-start"
                style={{
                    backgroundColor: 'var(--color-primary-light)',
                    border: '1px solid var(--color-gray-30)'
                }}
            >
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'white' }}
                >
                    <Info className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                </div>
                <div>
                    <h4 className="font-bold mb-1" style={{ color: 'var(--color-primary)' }}>Conseil d'expert</h4>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)', maxWidth: '600px' }}>
                        Augmentez le niveau de difficulté pour les agents confirmés afin de simuler des clients plus sceptiques et exigeants.
                    </p>
                </div>
            </div>
        </div>
    );
}
