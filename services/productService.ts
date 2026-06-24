import { ProductsApiResponseSchema, ApiProduct, PaginatedProducts } from '@/lib/schemas';
import { getBrands } from '@/services/brandService';
import { getCategories } from '@/services/categoryService';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1`;

async function fetchProducts(params: Record<string, string> = {}): Promise<ApiProduct[]> {
    const query = new URLSearchParams({ limit: '1000', ...params });
    const res = await fetch(`${BASE}/products?${query}`);
    if (!res.ok) throw new Error('Error fetching products');
    const json = await res.json();
    return ProductsApiResponseSchema.parse(json).data.items;
}

export async function getProducts(): Promise<ApiProduct[]> {
    return fetchProducts();
}

export async function getProductsByBrandName(brandName: string): Promise<ApiProduct[]> {
    const brands = await getBrands();
    const brand = brands.find((b) => b.brandName.toLowerCase() === brandName.toLowerCase());
    if (!brand) return [];
    return fetchProducts({ brandId: brand.id });
}

export async function getProductsByCategoryName(categoryName: string): Promise<ApiProduct[]> {
    const categories = await getCategories();
    const category = categories.find(
        (c) =>
            c.categoryName.toLowerCase() === categoryName.toLowerCase() &&
            c.parentCategoryId === null
    );
    if (!category) return [];
    return fetchProducts({ categoryId: category.id });
}

export async function getProductsBySubcategoryName(subcategoryName: string): Promise<ApiProduct[]> {
    const categories = await getCategories();
    const subcategory = categories.find(
        (c) =>
            c.categoryName.toLowerCase() === subcategoryName.toLowerCase() &&
            c.parentCategoryId !== null
    );
    if (!subcategory) return [];
    return fetchProducts({ categoryId: subcategory.id });
}

export async function getAllProductsAdmin(params: {
    page?: number;
    limit?: number;
    brandId?: string;
    available?: boolean;
    isPuntoFiesta?: boolean;
} = {}): Promise<PaginatedProducts> {
    const query = new URLSearchParams({ page: String(params.page ?? 1), limit: String(params.limit ?? 15) });
    if (params.brandId) query.set('brandId', params.brandId);
    if (params.available !== undefined) query.set('available', String(params.available));
    if (params.isPuntoFiesta !== undefined) query.set('isPuntoFiesta', String(params.isPuntoFiesta));
    const res = await fetchWithAuth(`${BASE}/products/admin?${query}`);
    const json = await res.json();
    return ProductsApiResponseSchema.parse(json).data;
}

export async function permanentDeleteProduct(id: string): Promise<void> {
    await fetchWithAuth(`${BASE}/products/${id}/permanent`, { method: 'DELETE' });
}

export async function createProduct(data: {
    productName: string;
    brandId: string;
    categoryId: string;
    price: number;
    contentValue: number;
    contentUnit: string;
    packQuantity: number;
    productImage?: string | null;
    stock?: number;
    isFeatured?: boolean;
}): Promise<ApiProduct> {
    const res = await fetchWithAuth(`${BASE}/products`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return (await res.json()).data;
}

export async function updateProduct(id: string, data: Partial<{
    productName: string;
    brandId: string;
    categoryId: string;
    price: number;
    contentValue: number;
    contentUnit: string;
    packQuantity: number;
    productImage: string | null;
    stock: number;
    pfStock: number;
    available: boolean;
    isFeatured: boolean;
    isPuntoFiesta: boolean;
}>): Promise<ApiProduct> {
    const res = await fetchWithAuth(`${BASE}/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    return (await res.json()).data;
}

export async function uploadProductImage(id: string, file: File): Promise<ApiProduct> {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetchWithAuth(`${BASE}/products/${id}/image`, {
        method: 'PATCH',
        body: fd,
    });
    return (await res.json()).data;
}

export async function deleteProduct(id: string): Promise<void> {
    await fetchWithAuth(`${BASE}/products/${id}`, { method: 'DELETE' });
}

export function formatPresentation(product: {
    contentValue: number;
    contentUnit: string;
    packQuantity: number;
}): string {
    if (product.packQuantity > 1) {
        return `${product.packQuantity} x ${product.contentValue} ${product.contentUnit}`;
    }
    return `${product.contentValue} ${product.contentUnit}`;
}
