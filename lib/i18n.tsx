'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ============================================================================
// SUPPORTED LANGUAGES
// ============================================================================

export type Language = 'en' | 'sq' | 'mk';

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'sq', label: 'Shqip', flag: '🇦🇱' },
  { code: 'mk', label: 'Македонски', flag: '🇲🇰' },
];

// ============================================================================
// TRANSLATION KEYS
// ============================================================================

type TranslationKeys = {
  // ── App Header ──
  'app.title': string;
  'app.signedIn': string;
  'app.logout': string;
  'app.version': string;
  'app.updateDownloading': string;
  'app.updateRestart': string;

  // ── Navigation Tabs ──
  'nav.products': string;
  'nav.elements': string;
  'nav.orders': string;
  'nav.production': string;
  'nav.inventory': string;
  'nav.storage': string;
  'nav.stock': string;

  // ── Common Actions ──
  'common.refresh': string;
  'common.save': string;
  'common.cancel': string;
  'common.delete': string;
  'common.close': string;
  'common.add': string;
  'common.edit': string;
  'common.print': string;
  'common.search': string;
  'common.loading': string;
  'common.confirm': string;
  'common.done': string;
  'common.all': string;
  'common.yes': string;
  'common.no': string;
  'common.boxes': string;
  'common.box': string;
  'common.units': string;
  'common.inStock': string;
  'common.total': string;
  'common.complete': string;

  // ── Orders Tab ──
  'orders.title': string;
  'orders.newOrder': string;
  'orders.searchPlaceholder': string;
  'orders.noOrders': string;
  'orders.noOrdersHint': string;
  'orders.noMatch': string;
  'orders.noMatchHint': string;
  'orders.pending': string;
  'orders.inProduction': string;
  'orders.shipped': string;
  'orders.created': string;
  'orders.products': string;
  'orders.produce': string;
  'orders.ship': string;
  'orders.confirmShip': string;
  'orders.confirmDelete': string;
  'orders.shipping': string;
  'orders.starting': string;
  'orders.deleting': string;
  'orders.shippedOn': string;
  'orders.stockAutoApplied': string;
  'orders.fromStock': string;
  'orders.editOrder': string;
  'orders.cannotEditShipped': string;
  'orders.notes': string;
  'orders.addProducts': string;
  'orders.selectProducts': string;
  'orders.boxesNeeded': string;
  'orders.finalize': string;
  'orders.finalizing': string;
  'orders.itemsInOrder': string;
  'orders.addToOrder': string;
  'orders.added': string;
  'orders.alreadyAdded': string;
  'orders.unitsTotal': string;
  'orders.clientName': string;

  // ── Order Detail Modal ──
  'orderDetail.productsInOrder': string;
  'orderDetail.noProducts': string;

  // ── Production Tab ──
  'production.title': string;
  'production.subtitle': string;
  'production.totalRequirements': string;
  'production.aggregated': string;
  'production.noOrders': string;
  'production.noOrdersHint': string;
  'production.noData': string;
  'production.need': string;
  'production.inStock': string;
  'production.remaining': string;
  'production.weight': string;
  'production.totalWeight': string;
  'production.elementTypes': string;
  'production.printAssembly': string;
  'production.assemblySheet': string;
  'production.productionPrint': string;
  'production.qty': string;
  'production.applyInventory': string;
  'production.allocated': string;
  'production.excess': string;
  'production.noExcess': string;
  'production.applySuccess': string;
  'production.applyFailed': string;

  // ── Inventory / Assembly Tab ──
  'inventory.title': string;
  'inventory.subtitle': string;
  'inventory.noElements': string;
  'inventory.noElementsHint': string;
  'inventory.assembly': string;
  'inventory.assemblySubtitle': string;
  'inventory.noOrdersInProduction': string;
  'inventory.recordBoxes': string;
  'inventory.excessAssembly': string;
  'inventory.excessSubtitle': string;
  'inventory.finishOrdersFirst': string;
  'inventory.canAssemble': string;
  'inventory.extraBoxes': string;
  'inventory.addMax': string;
  'inventory.deleteConfirm': string;
  'inventory.addManual': string;
  'inventory.element': string;
  'inventory.searchElement': string;
  'inventory.noElementsMatch': string;
  'inventory.selected': string;
  'inventory.quantity': string;
  'inventory.enterQuantity': string;
  'inventory.addToInventory': string;
  'inventory.selectElement': string;
  'inventory.validQuantity': string;
  'inventory.removeQuantity': string;
  'inventory.removeFromInventory': string;
  'inventory.removeSuccess': string;
  'inventory.maxRemove': string;

  // ── Stock Tab ──
  'stock.title': string;
  'stock.subtitle': string;
  'stock.noData': string;
  'stock.noDataHint': string;
  'stock.excessStock': string;
  'stock.excessSubtitle': string;
  'stock.excessSubtitleManual': string;
  'stock.noExcess': string;
  'stock.noExcessHint': string;
  'stock.totalBoxes': string;
  'stock.orderComplete': string;
  'stock.orderIncomplete': string;
  'stock.applyFromStock': string;
  'stock.available': string;
  'stock.apply': string;
  'stock.applyFailed': string;

  // ── Storage Tab ──
  'storage.title': string;
  'storage.rawMaterials': string;

  // ── Products Tab ──
  'products.title': string;
  'products.newProduct': string;

  // ── Elements Tab ──
  'elements.title': string;
  'elements.newElement': string;

  // ── Print ──
  'print.assemblySheet': string;
  'print.preview': string;
  'print.previewHint': string;
  'print.printBtn': string;
  'print.serialNumber': string;
  'print.product': string;
  'print.label': string;
  'print.date': string;
  'print.productionPrintPreview': string;
  'print.productionPrintHint': string;
  'print.orderOf': string;
  'print.totalRequirements': string;
  'print.ordersInProduction': string;
  'print.labeledElements': string;

  // ── Auth ──
  'auth.startingApp': string;
  'auth.createAccount': string;
  'auth.signIn': string;
  'auth.createAccountSubtitle': string;
  'auth.signInSubtitle': string;
  'auth.username': string;
  'auth.usernamePlaceholder': string;
  'auth.password': string;
  'auth.passwordPlaceholder': string;
  'auth.confirmPassword': string;
  'auth.confirmPasswordPlaceholder': string;
  'auth.pleaseWait': string;
  'auth.alreadyHaveAccount': string;
  'auth.needAccount': string;
  'auth.usernameRequired': string;
  'auth.usernameMinLength': string;
  'auth.passwordRequired': string;
  'auth.passwordMinLength': string;
  'auth.passwordsNoMatch': string;
  'auth.registrationFailed': string;
  'auth.loginFailed': string;
  'auth.requiresDesktop': string;

  // ── Create Order ──
  'createOrder.title': string;
  'createOrder.clientPlaceholder': string;
  'createOrder.initialStatus': string;
  'createOrder.notesPlaceholder': string;
  'createOrder.clientRequired': string;
  'createOrder.creating': string;
  'createOrder.create': string;

  // ── Create Element ──
  'createElement.title': string;
  'createElement.name': string;
  'createElement.namePlaceholder': string;
  'createElement.labelPlaceholder': string;
  'createElement.material': string;
  'createElement.materialPlaceholder': string;
  'createElement.weight': string;
  'createElement.dualColor': string;
  'createElement.creating': string;
  'createElement.nameRequired': string;
  'createElement.materialRequired': string;
  'createElement.weightRequired': string;
  'createElement.selectColor': string;
  'createElement.selectSecondColor': string;

  // ── Create Product ──
  'createProduct.title': string;
  'createProduct.serialNumber': string;
  'createProduct.serialPlaceholder': string;
  'createProduct.labelPlaceholder': string;
  'createProduct.category': string;
  'createProduct.selectCategory': string;
  'createProduct.newCategory': string;
  'createProduct.newCategoryPlaceholder': string;
  'createProduct.unitsPerBox': string;
  'createProduct.boxType': string;
  'createProduct.noBoxDeduction': string;
  'createProduct.imageRequired': string;
  'createProduct.creating': string;
  'createProduct.create': string;
  'createProduct.serialRequired': string;
  'createProduct.categoryRequired': string;
  'createProduct.imageReq': string;
  'createProduct.unitsError': string;

  // ── Order Items ──
  'orderItems.addedProducts': string;
  'orderItems.searchPlaceholder': string;
  'orderItems.loadingProducts': string;
  'orderItems.noProducts': string;
  'orderItems.noMatch': string;
  'orderItems.boxesOf': string;
  'orderItems.adding': string;

  // ── Product Elements ──
  'productElements.title': string;
  'productElements.chooseFor': string;
  'productElements.searchPlaceholder': string;
  'productElements.noMatch': string;
  'productElements.noElements': string;
  'productElements.qty': string;
  'productElements.saving': string;
  'productElements.saveElements': string;

  // ── Product Card ──
  'productCard.noImage': string;
  'productCard.more': string;
  'productCard.noElements': string;
  'productCard.sure': string;
  'productCard.clone': string;

  // ── Update Notification ──
  'update.checkFailed': string;
  'update.checkFailedMsg': string;
  'update.available': string;
  'update.availableMsg': string;
  'update.downloading': string;
  'update.downloadingTitle': string;
  'update.downloaded': string;
  'update.readyTitle': string;
  'update.readyMsg': string;
  'update.restartInstall': string;
  'update.installing': string;
  'update.later': string;

  // ── Storage (extended) ──
  'storage.subtitle': string;
  'storage.addMaterial': string;
  'storage.noMaterials': string;
  'storage.noMaterialsHint': string;
  'storage.noMatch': string;
  'storage.noMatchHint': string;
  'storage.unit': string;
  'storage.currentStock': string;
  'storage.adjustStock': string;
  'storage.addRawMaterial': string;
  'storage.materialPlaceholder': string;
  'storage.unitOfMeasurement': string;
  'storage.grams': string;
  'storage.kilograms': string;
  'storage.unitsLabel': string;
  'storage.meters': string;
  'storage.liters': string;
  'storage.sheets': string;
  'storage.addStock': string;
  'storage.removeStock': string;
  'storage.reasonPlaceholder': string;
  'storage.newStockWillBe': string;
  'storage.adjusting': string;
  'storage.editRawMaterial': string;
  'storage.materialName': string;
  'storage.saving': string;
  'storage.creating': string;
};

// ============================================================================
// TRANSLATIONS
// ============================================================================

const translations: Record<Language, TranslationKeys> = {
  en: {
    'app.title': 'Production Management',
    'app.signedIn': 'Signed in as',
    'app.logout': 'Logout',
    'app.version': 'v',
    'app.updateDownloading': 'downloading...',
    'app.updateRestart': 'Update — Restart',

    'nav.products': 'Products',
    'nav.elements': 'Elements',
    'nav.orders': 'Orders',
    'nav.production': 'Production',
    'nav.inventory': 'Inventory',
    'nav.storage': 'Storage',
    'nav.stock': 'Stock',

    'common.refresh': 'Refresh',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.close': 'Close',
    'common.add': 'Add',
    'common.edit': 'Edit',
    'common.print': 'Print',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.confirm': 'Confirm?',
    'common.done': 'Done',
    'common.all': 'All',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.boxes': 'boxes',
    'common.box': 'box',
    'common.units': 'units',
    'common.inStock': 'in stock',
    'common.total': 'Total',
    'common.complete': 'Complete',

    'orders.title': 'Orders',
    'orders.newOrder': 'New Order',
    'orders.searchPlaceholder': 'Search by client or #...',
    'orders.noOrders': 'No orders yet',
    'orders.noOrdersHint': 'Click "New Order" to create your first order.',
    'orders.noMatch': 'No orders match your filter',
    'orders.noMatchHint': 'Try a different status or search term.',
    'orders.pending': 'Pending',
    'orders.inProduction': 'In Production',
    'orders.shipped': 'Shipped',
    'orders.created': 'Created',
    'orders.products': 'products',
    'orders.produce': 'Produce',
    'orders.ship': 'Ship',
    'orders.confirmShip': 'Confirm Ship?',
    'orders.confirmDelete': 'Confirm?',
    'orders.shipping': 'Shipping...',
    'orders.starting': 'Starting...',
    'orders.deleting': 'Deleting...',
    'orders.shippedOn': 'Shipped',
    'orders.stockAutoApplied': 'Stock auto-applied:',
    'orders.fromStock': 'from stock',
    'orders.editOrder': 'Edit Order',
    'orders.cannotEditShipped': 'Shipped orders cannot be edited',
    'orders.notes': 'Notes',
    'orders.addProducts': 'Add Products',
    'orders.selectProducts': 'Select products and specify boxes needed',
    'orders.boxesNeeded': 'Boxes needed',
    'orders.finalize': 'Done — Finalize Order',
    'orders.finalizing': 'Finalizing...',
    'orders.itemsInOrder': 'in order',
    'orders.addToOrder': 'Add to Order',
    'orders.added': 'Added',
    'orders.alreadyAdded': 'This product is already added to the order.',
    'orders.unitsTotal': 'units total',
    'orders.clientName': 'Client Name',

    'orderDetail.productsInOrder': 'Products in Order',
    'orderDetail.noProducts': 'No products in this order.',

    'production.title': 'Production Orders',
    'production.subtitle': 'Track element manufacturing progress for orders in production',
    'production.totalRequirements': 'Total Requirements',
    'production.aggregated': 'Aggregated across all orders',
    'production.noOrders': 'No orders in production',
    'production.noOrdersHint': 'Set an order\'s status to "In Production" from the Orders tab to see it here.',
    'production.noData': 'No production data',
    'production.need': 'Need',
    'production.inStock': 'In Stock',
    'production.remaining': 'Rem',
    'production.weight': 'Weight',
    'production.totalWeight': 'Total weight',
    'production.elementTypes': 'element types',
    'production.printAssembly': 'Print assembly sheet',
    'production.assemblySheet': 'Assembly Sheet',
    'production.productionPrint': 'Production Print',
    'production.qty': 'Qty',
    'production.applyInventory': 'Apply Inventory',
    'production.allocated': 'Allocated',
    'production.excess': 'Excess',
    'production.noExcess': 'No excess available',
    'production.applySuccess': 'Inventory applied successfully',
    'production.applyFailed': 'Failed to apply inventory',

    'inventory.title': 'Element Inventory',
    'inventory.subtitle': 'Current stock of manufactured elements',
    'inventory.noElements': 'No elements in inventory',
    'inventory.noElementsHint': 'Record production in the Production tab to add elements.',
    'inventory.assembly': 'Assembly',
    'inventory.assemblySubtitle': 'Record boxes assembled today',
    'inventory.noOrdersInProduction': 'No orders in production',
    'inventory.recordBoxes': 'Record boxes assembled today',
    'inventory.excessAssembly': 'Excess Assembly',
    'inventory.excessSubtitle': 'Products you can assemble from leftover inventory',
    'inventory.finishOrdersFirst': 'Finish orders first',
    'inventory.canAssemble': 'Can assemble',
    'inventory.extraBoxes': 'extra',
    'inventory.addMax': 'Add (max',
    'inventory.deleteConfirm': 'Delete inventory for',
    'inventory.addManual': 'Add Inventory',
    'inventory.element': 'Element',
    'inventory.searchElement': 'Search elements...',
    'inventory.noElementsMatch': 'No elements match',
    'inventory.selected': 'Selected',
    'inventory.quantity': 'Quantity',
    'inventory.enterQuantity': 'Enter quantity',
    'inventory.addToInventory': 'Add to Inventory',
    'inventory.selectElement': 'Please select an element',
    'inventory.validQuantity': 'Enter a valid quantity (≥ 1)',
    'inventory.removeQuantity': 'Remove quantity',
    'inventory.removeFromInventory': 'Remove',
    'inventory.removeSuccess': 'Inventory updated successfully',
    'inventory.maxRemove': 'Max',

    'stock.title': 'Stock Overview',
    'stock.subtitle': 'Completed boxes per order & excess stock',
    'stock.noData': 'No order stock data yet',
    'stock.noDataHint': 'Assemble boxes in the Inventory tab to see stock here.',
    'stock.excessStock': 'Excess Stock',
    'stock.excessSubtitle': 'Boxes assembled from excess inventory (auto-applied to new orders)',
    'stock.excessSubtitleManual': 'Boxes assembled from excess inventory (apply manually to orders via buttons)',
    'stock.noExcess': 'No excess stock',
    'stock.noExcessHint': 'Assemble excess boxes from the Inventory tab to build stock.',
    'stock.totalBoxes': 'total boxes',
    'stock.orderComplete': 'Order complete — ready to ship',
    'stock.orderIncomplete': 'Not all products assembled yet',
    'stock.applyFromStock': 'Apply from stock',
    'stock.available': 'available',
    'stock.apply': 'Apply',
    'stock.applyFailed': 'Failed to apply stock to order',

    'storage.title': 'Storage',
    'storage.rawMaterials': 'Raw Materials',

    'products.title': 'Products',
    'products.newProduct': 'New Product',

    'elements.title': 'Elements',
    'elements.newElement': 'New Element',

    'print.assemblySheet': 'Assembly Sheet',
    'print.preview': 'Assembly Sheet Preview',
    'print.previewHint': 'A4 Landscape · Click the button to print',
    'print.printBtn': 'Print',
    'print.serialNumber': 'Serial Number',
    'print.product': 'Product',
    'print.label': 'Label',
    'print.date': 'Date',
    'print.productionPrintPreview': 'Production Print Preview',
    'print.productionPrintHint': 'Landscape A4 · Click the button to print',
    'print.orderOf': 'Order',
    'print.totalRequirements': 'Total Requirements — All Orders',
    'print.ordersInProduction': 'order(s) in production',
    'print.labeledElements': 'Labeled Elements',

    'auth.startingApp': 'Starting application...',
    'auth.createAccount': 'Create Account',
    'auth.signIn': 'Sign In',
    'auth.createAccountSubtitle': 'Create your account to get started',
    'auth.signInSubtitle': 'Sign in to your account',
    'auth.username': 'Username',
    'auth.usernamePlaceholder': 'Enter your username',
    'auth.password': 'Password',
    'auth.passwordPlaceholder': 'Enter your password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.confirmPasswordPlaceholder': 'Re-enter your password',
    'auth.pleaseWait': 'Please wait...',
    'auth.alreadyHaveAccount': 'Already have an account?',
    'auth.needAccount': 'Need an account?',
    'auth.usernameRequired': 'Username is required',
    'auth.usernameMinLength': 'Username must be at least 3 characters',
    'auth.passwordRequired': 'Password is required',
    'auth.passwordMinLength': 'Password must be at least 4 characters',
    'auth.passwordsNoMatch': 'Passwords do not match',
    'auth.registrationFailed': 'Registration failed. Please try again.',
    'auth.loginFailed': 'Login failed. Please try again.',
    'auth.requiresDesktop': 'This requires the desktop application.',

    'createOrder.title': 'New Order',
    'createOrder.clientPlaceholder': 'Enter client name',
    'createOrder.initialStatus': 'Initial Status',
    'createOrder.notesPlaceholder': 'Any notes about this order...',
    'createOrder.clientRequired': 'Client name is required.',
    'createOrder.creating': 'Creating...',
    'createOrder.create': 'Create Order',

    'createElement.title': 'New Element',
    'createElement.name': 'Name',
    'createElement.namePlaceholder': 'e.g., Bucket, Shovel',
    'createElement.labelPlaceholder': 'Groups in production view',
    'createElement.material': 'Material',
    'createElement.materialPlaceholder': 'Plastic, Metal...',
    'createElement.weight': 'Weight (g)',
    'createElement.dualColor': 'Dual color element',
    'createElement.creating': 'Creating...',
    'createElement.nameRequired': 'Name is required',
    'createElement.materialRequired': 'Material is required',
    'createElement.weightRequired': 'Weight must be > 0',
    'createElement.selectColor': 'Select a color',
    'createElement.selectSecondColor': 'Select a second color for dual-color',

    'createProduct.title': 'New Product',
    'createProduct.serialNumber': 'Serial Number',
    'createProduct.serialPlaceholder': 'e.g. BKT-001',
    'createProduct.labelPlaceholder': 'e.g. Premium Red Bucket',
    'createProduct.category': 'Category',
    'createProduct.selectCategory': 'Select...',
    'createProduct.newCategory': '+ New',
    'createProduct.newCategoryPlaceholder': 'New category name',
    'createProduct.unitsPerBox': 'Units/Box',
    'createProduct.boxType': 'Box Type (for assembly deduction)',
    'createProduct.noBoxDeduction': 'None (no box deduction)',
    'createProduct.imageRequired': 'Image *',
    'createProduct.creating': 'Creating...',
    'createProduct.create': 'Create Product',
    'createProduct.serialRequired': 'Serial number is required',
    'createProduct.categoryRequired': 'Category is required',
    'createProduct.imageReq': 'Product image is required',
    'createProduct.unitsError': 'Units per box must be at least 1',

    'orderItems.addedProducts': 'Added Products',
    'orderItems.searchPlaceholder': 'Search products by serial or category...',
    'orderItems.loadingProducts': 'Loading products...',
    'orderItems.noProducts': 'No products found. Create products first.',
    'orderItems.noMatch': 'No products match your search.',
    'orderItems.boxesOf': 'Boxes of',
    'orderItems.adding': 'Adding...',

    'productElements.title': 'Select Elements',
    'productElements.chooseFor': 'Choose elements for',
    'productElements.searchPlaceholder': 'Search elements by name, color, or material...',
    'productElements.noMatch': 'No elements match your search',
    'productElements.noElements': 'No elements available',
    'productElements.qty': 'Qty',
    'productElements.saving': 'Saving...',
    'productElements.saveElements': 'Save Elements',

    'productCard.noImage': 'No image',
    'productCard.more': 'more',
    'productCard.noElements': 'No elements',
    'productCard.sure': 'Sure?',
    'productCard.clone': 'Clone',

    'update.checkFailed': 'Update Check Failed',
    'update.checkFailedMsg': 'Failed to check for updates',
    'update.available': 'Update Available',
    'update.availableMsg': 'is available. Downloading in background...',
    'update.downloading': 'Downloading...',
    'update.downloadingTitle': 'Downloading Update',
    'update.downloaded': 'downloaded',
    'update.readyTitle': 'Update Ready to Install',
    'update.readyMsg': 'has been downloaded and is ready to install.',
    'update.restartInstall': 'Restart & Install',
    'update.installing': 'Installing...',
    'update.later': 'Later',

    'storage.subtitle': 'Manage raw material stock levels',
    'storage.addMaterial': 'Add Material',
    'storage.noMaterials': 'No raw materials yet',
    'storage.noMaterialsHint': 'Click "Add Material" to add your first raw material.',
    'storage.noMatch': 'No materials match your search',
    'storage.noMatchHint': 'Try a different search term.',
    'storage.unit': 'Unit',
    'storage.currentStock': 'Current Stock',
    'storage.adjustStock': 'Adjust Stock',
    'storage.addRawMaterial': 'Add Raw Material',
    'storage.materialPlaceholder': 'Material name (e.g., PVC, PP, Cardboard Box A)',
    'storage.unitOfMeasurement': 'Unit of measurement',
    'storage.grams': 'Grams (g)',
    'storage.kilograms': 'Kilograms (kg)',
    'storage.unitsLabel': 'Units',
    'storage.meters': 'Meters',
    'storage.liters': 'Liters',
    'storage.sheets': 'Sheets',
    'storage.addStock': 'Add Stock',
    'storage.removeStock': 'Remove Stock',
    'storage.reasonPlaceholder': 'Reason (optional)',
    'storage.newStockWillBe': 'New stock will be:',
    'storage.adjusting': 'Adjusting...',
    'storage.editRawMaterial': 'Edit Raw Material',
    'storage.materialName': 'Material name',
    'storage.saving': 'Saving...',
    'storage.creating': 'Creating...',
  },

  sq: {
    'app.title': 'Menaxhimi i Prodhimit',
    'app.signedIn': 'Identifikuar si',
    'app.logout': 'Dil',
    'app.version': 'v',
    'app.updateDownloading': 'duke shkarkuar...',
    'app.updateRestart': 'Përditëso — Rifillo',

    'nav.products': 'Produktet',
    'nav.elements': 'Elementet',
    'nav.orders': 'Porositë',
    'nav.production': 'Prodhimi',
    'nav.inventory': 'Inventari',
    'nav.storage': 'Magazina',
    'nav.stock': 'Stoku',

    'common.refresh': 'Rifresko',
    'common.save': 'Ruaj',
    'common.cancel': 'Anulo',
    'common.delete': 'Fshi',
    'common.close': 'Mbyll',
    'common.add': 'Shto',
    'common.edit': 'Ndrysho',
    'common.print': 'Printo',
    'common.search': 'Kërko',
    'common.loading': 'Duke ngarkuar...',
    'common.confirm': 'Konfirmo?',
    'common.done': 'Përfunduar',
    'common.all': 'Të gjitha',
    'common.yes': 'Po',
    'common.no': 'Jo',
    'common.boxes': 'kuti',
    'common.box': 'kuti',
    'common.units': 'njësi',
    'common.inStock': 'në stok',
    'common.total': 'Totali',
    'common.complete': 'E plotë',

    'orders.title': 'Porositë',
    'orders.newOrder': 'Porosi e re',
    'orders.searchPlaceholder': 'Kërko sipas klientit ose #...',
    'orders.noOrders': 'Nuk ka porosi ende',
    'orders.noOrdersHint': 'Kliko "Porosi e re" për të krijuar porosinë e parë.',
    'orders.noMatch': 'Asnjë porosi nuk përputhet me filtrin',
    'orders.noMatchHint': 'Provo një status ose kërkim tjetër.',
    'orders.pending': 'Në pritje',
    'orders.inProduction': 'Në prodhim',
    'orders.shipped': 'Dërguar',
    'orders.created': 'Krijuar',
    'orders.products': 'produkte',
    'orders.produce': 'Prodho',
    'orders.ship': 'Dërgo',
    'orders.confirmShip': 'Konfirmo dërgimin?',
    'orders.confirmDelete': 'Konfirmo?',
    'orders.shipping': 'Duke dërguar...',
    'orders.starting': 'Duke filluar...',
    'orders.deleting': 'Duke fshirë...',
    'orders.shippedOn': 'Dërguar',
    'orders.stockAutoApplied': 'Stoku u aplikua automatikisht:',
    'orders.fromStock': 'nga stoku',
    'orders.editOrder': 'Ndrysho porosinë',
    'orders.cannotEditShipped': 'Porositë e dërguara nuk mund të ndryshohen',
    'orders.notes': 'Shënime',
    'orders.addProducts': 'Shto Produkte',
    'orders.selectProducts': 'Zgjidh produktet dhe specifiko kutitë e nevojshme',
    'orders.boxesNeeded': 'Kuti të nevojshme',
    'orders.finalize': 'Gati — Përfundo Porosinë',
    'orders.finalizing': 'Duke përfunduar...',
    'orders.itemsInOrder': 'në porosi',
    'orders.addToOrder': 'Shto në Porosi',
    'orders.added': 'Shtuar',
    'orders.alreadyAdded': 'Ky produkt është shtuar tashmë në porosi.',
    'orders.unitsTotal': 'njësi gjithsej',
    'orders.clientName': 'Emri i klientit',

    'orderDetail.productsInOrder': 'Produktet në Porosi',
    'orderDetail.noProducts': 'Nuk ka produkte në këtë porosi.',

    'production.title': 'Porositë e Prodhimit',
    'production.subtitle': 'Ndiq progresin e prodhimit të elementeve për porositë në prodhim',
    'production.totalRequirements': 'Kërkesat Totale',
    'production.aggregated': 'Të agreguara nga të gjitha porositë',
    'production.noOrders': 'Nuk ka porosi në prodhim',
    'production.noOrdersHint': 'Vendos statusin e porosisë në "Në Prodhim" nga skeda e Porosive.',
    'production.noData': 'Nuk ka të dhëna prodhimi',
    'production.need': 'Nevojitet',
    'production.inStock': 'Në Stok',
    'production.remaining': 'Mbetur',
    'production.weight': 'Pesha',
    'production.totalWeight': 'Pesha gjithsej',
    'production.elementTypes': 'lloje elementesh',
    'production.printAssembly': 'Printo fletën e montimit',
    'production.assemblySheet': 'Fleta e Montimit',
    'production.productionPrint': 'Printimi i Prodhimit',
    'production.qty': 'Sasia',
    'production.applyInventory': 'Apliko Inventarin',
    'production.allocated': 'Alokuar',
    'production.excess': 'Tepricë',
    'production.noExcess': 'Nuk ka tepricë të disponueshme',
    'production.applySuccess': 'Inventari u aplikua me sukses',
    'production.applyFailed': 'Dështoi aplikimi i inventarit',

    'inventory.title': 'Inventari i Elementeve',
    'inventory.subtitle': 'Stoku aktual i elementeve të prodhuara',
    'inventory.noElements': 'Nuk ka elemente në inventar',
    'inventory.noElementsHint': 'Regjistro prodhimin në skedën e Prodhimit për të shtuar elemente.',
    'inventory.assembly': 'Montimi',
    'inventory.assemblySubtitle': 'Regjistro kutitë e montuara sot',
    'inventory.noOrdersInProduction': 'Nuk ka porosi në prodhim',
    'inventory.recordBoxes': 'Regjistro kutitë e montuara sot',
    'inventory.excessAssembly': 'Montim shtesë',
    'inventory.excessSubtitle': 'Produkte që mund të montohen nga inventari i mbetur',
    'inventory.finishOrdersFirst': 'Përfundo porositë fillimisht',
    'inventory.canAssemble': 'Mund të montoni',
    'inventory.extraBoxes': 'shtesë',
    'inventory.addMax': 'Shto (max',
    'inventory.deleteConfirm': 'Fshi inventarin për',
    'inventory.addManual': 'Shto Inventar',
    'inventory.element': 'Elementi',
    'inventory.searchElement': 'Kërko elemente...',
    'inventory.noElementsMatch': 'Nuk ka elemente përputhëse',
    'inventory.selected': 'Zgjedhur',
    'inventory.quantity': 'Sasia',
    'inventory.enterQuantity': 'Vendos sasinë',
    'inventory.addToInventory': 'Shto në Inventar',
    'inventory.selectElement': 'Ju lutem zgjidhni një element',
    'inventory.validQuantity': 'Vendos një sasi të vlefshme (≥ 1)',
    'inventory.removeQuantity': 'Hiq sasinë',
    'inventory.removeFromInventory': 'Hiq',
    'inventory.removeSuccess': 'Inventari u përditësua me sukses',
    'inventory.maxRemove': 'Max',

    'stock.title': 'Pasqyra e Stokut',
    'stock.subtitle': 'Kutitë e përfunduara për porosi dhe stoku shtesë',
    'stock.noData': 'Nuk ka të dhëna stoku ende',
    'stock.noDataHint': 'Monto kuti në skedën e Inventarit për të parë stokun këtu.',
    'stock.excessStock': 'Stoku Shtesë',
    'stock.excessSubtitle': 'Kuti të montuara nga inventari shtesë (aplikohen automatikisht në porositë e reja)',
    'stock.excessSubtitleManual': 'Kuti të montuara nga inventari shtesë (apliko manualisht në porosi me butonat)',
    'stock.noExcess': 'Nuk ka stok shtesë',
    'stock.noExcessHint': 'Monto kuti shtesë nga skeda e Inventarit për të ndërtuar stok.',
    'stock.totalBoxes': 'kuti gjithsej',
    'stock.orderComplete': 'Porosia e plotë — gati për dërgim',
    'stock.orderIncomplete': 'Jo të gjitha produktet janë montuar ende',
    'stock.applyFromStock': 'Apliko nga stoku',
    'stock.available': 'të disponueshme',
    'stock.apply': 'Apliko',
    'stock.applyFailed': 'Dështoi aplikimi i stokut në porosi',

    'storage.title': 'Magazina',
    'storage.rawMaterials': 'Lëndë e parë',

    'products.title': 'Produktet',
    'products.newProduct': 'Produkt i ri',

    'elements.title': 'Elementet',
    'elements.newElement': 'Element i ri',

    'print.assemblySheet': 'Fleta e Montimit',
    'print.preview': 'Pamja e Fletës së Montimit',
    'print.previewHint': 'A4 Peizazh · Kliko butonin për të printuar',
    'print.printBtn': 'Printo',
    'print.serialNumber': 'Numri Serial',
    'print.product': 'Produkti',
    'print.label': 'Etiketa',
    'print.date': 'Data',
    'print.productionPrintPreview': 'Pamja e Printimit të Prodhimit',
    'print.productionPrintHint': 'Peizazh A4 · Kliko butonin për të printuar',
    'print.orderOf': 'Porosia',
    'print.totalRequirements': 'Kërkesat Totale — Të Gjitha Porositë',
    'print.ordersInProduction': 'porosi në prodhim',
    'print.labeledElements': 'Elemente me Etiketë',

    'auth.startingApp': 'Duke startuar aplikacionin...',
    'auth.createAccount': 'Krijo Llogari',
    'auth.signIn': 'Identifikohu',
    'auth.createAccountSubtitle': 'Krijo llogarinë tënde për të filluar',
    'auth.signInSubtitle': 'Identifikohu në llogarinë tënde',
    'auth.username': 'Emri i përdoruesit',
    'auth.usernamePlaceholder': 'Vendos emrin e përdoruesit',
    'auth.password': 'Fjalëkalimi',
    'auth.passwordPlaceholder': 'Vendos fjalëkalimin',
    'auth.confirmPassword': 'Konfirmo Fjalëkalimin',
    'auth.confirmPasswordPlaceholder': 'Rivendos fjalëkalimin',
    'auth.pleaseWait': 'Ju lutem prisni...',
    'auth.alreadyHaveAccount': 'Keni tashmë një llogari?',
    'auth.needAccount': 'Keni nevojë për llogari?',
    'auth.usernameRequired': 'Emri i përdoruesit kërkohet',
    'auth.usernameMinLength': 'Emri i përdoruesit duhet të jetë së paku 3 karaktere',
    'auth.passwordRequired': 'Fjalëkalimi kërkohet',
    'auth.passwordMinLength': 'Fjalëkalimi duhet të jetë së paku 4 karaktere',
    'auth.passwordsNoMatch': 'Fjalëkalimet nuk përputhen',
    'auth.registrationFailed': 'Regjistrimi dështoi. Provoni përsëri.',
    'auth.loginFailed': 'Identifikimi dështoi. Provoni përsëri.',
    'auth.requiresDesktop': 'Kjo kërkon aplikacionin desktop.',

    'createOrder.title': 'Porosi e Re',
    'createOrder.clientPlaceholder': 'Vendos emrin e klientit',
    'createOrder.initialStatus': 'Statusi Fillestar',
    'createOrder.notesPlaceholder': 'Shënime për këtë porosi...',
    'createOrder.clientRequired': 'Emri i klientit kërkohet.',
    'createOrder.creating': 'Duke krijuar...',
    'createOrder.create': 'Krijo Porosinë',

    'createElement.title': 'Element i Ri',
    'createElement.name': 'Emri',
    'createElement.namePlaceholder': 'p.sh., Kovë, Lopatë',
    'createElement.labelPlaceholder': 'Grupon në pamjen e prodhimit',
    'createElement.material': 'Materiali',
    'createElement.materialPlaceholder': 'Plastikë, Metal...',
    'createElement.weight': 'Pesha (g)',
    'createElement.dualColor': 'Element me dy ngjyra',
    'createElement.creating': 'Duke krijuar...',
    'createElement.nameRequired': 'Emri kërkohet',
    'createElement.materialRequired': 'Materiali kërkohet',
    'createElement.weightRequired': 'Pesha duhet të jetë > 0',
    'createElement.selectColor': 'Zgjidh një ngjyrë',
    'createElement.selectSecondColor': 'Zgjidh ngjyrën e dytë',

    'createProduct.title': 'Produkt i Ri',
    'createProduct.serialNumber': 'Numri Serial',
    'createProduct.serialPlaceholder': 'p.sh. BKT-001',
    'createProduct.labelPlaceholder': 'p.sh. Kovë e Kuqe Premium',
    'createProduct.category': 'Kategoria',
    'createProduct.selectCategory': 'Zgjidh...',
    'createProduct.newCategory': '+ E re',
    'createProduct.newCategoryPlaceholder': 'Emri i kategorisë së re',
    'createProduct.unitsPerBox': 'Njësi/Kuti',
    'createProduct.boxType': 'Tipi i kutisë (për zbritje montimi)',
    'createProduct.noBoxDeduction': 'Asnjë (pa zbritje kutie)',
    'createProduct.imageRequired': 'Imazhi *',
    'createProduct.creating': 'Duke krijuar...',
    'createProduct.create': 'Krijo Produktin',
    'createProduct.serialRequired': 'Numri serial kërkohet',
    'createProduct.categoryRequired': 'Kategoria kërkohet',
    'createProduct.imageReq': 'Imazhi i produktit kërkohet',
    'createProduct.unitsError': 'Njësitë për kuti duhet të jenë së paku 1',

    'orderItems.addedProducts': 'Produkte të Shtuara',
    'orderItems.searchPlaceholder': 'Kërko produkte sipas serialit ose kategorisë...',
    'orderItems.loadingProducts': 'Duke ngarkuar produktet...',
    'orderItems.noProducts': 'Nuk u gjetën produkte. Krijoni produkte fillimisht.',
    'orderItems.noMatch': 'Asnjë produkt nuk përputhet me kërkimin.',
    'orderItems.boxesOf': 'Kuti të',
    'orderItems.adding': 'Duke shtuar...',

    'productElements.title': 'Zgjidh Elementet',
    'productElements.chooseFor': 'Zgjidh elementet për',
    'productElements.searchPlaceholder': 'Kërko elemente sipas emrit, ngjyrës ose materialit...',
    'productElements.noMatch': 'Asnjë element nuk përputhet me kërkimin',
    'productElements.noElements': 'Nuk ka elemente të disponueshme',
    'productElements.qty': 'Sasia',
    'productElements.saving': 'Duke ruajtur...',
    'productElements.saveElements': 'Ruaj Elementet',

    'productCard.noImage': 'Pa imazh',
    'productCard.more': 'më shumë',
    'productCard.noElements': 'Pa elemente',
    'productCard.sure': 'Sigurt?',
    'productCard.clone': 'Kopjo',

    'update.checkFailed': 'Kontrolli i Përditësimit Dështoi',
    'update.checkFailedMsg': 'Dështoi kontrolli për përditësime',
    'update.available': 'Përditësim i Disponueshëm',
    'update.availableMsg': 'është i disponueshëm. Duke shkarkuar në sfond...',
    'update.downloading': 'Duke shkarkuar...',
    'update.downloadingTitle': 'Duke Shkarkuar Përditësimin',
    'update.downloaded': 'shkarkuar',
    'update.readyTitle': 'Përditësimi Gati për Instalim',
    'update.readyMsg': 'është shkarkuar dhe gati për instalim.',
    'update.restartInstall': 'Rifillo & Instalo',
    'update.installing': 'Duke instaluar...',
    'update.later': 'Më vonë',

    'storage.subtitle': 'Menaxho nivelet e stokut të lëndës së parë',
    'storage.addMaterial': 'Shto Material',
    'storage.noMaterials': 'Nuk ka lëndë të parë ende',
    'storage.noMaterialsHint': 'Kliko "Shto Material" për të shtuar lëndën e parë.',
    'storage.noMatch': 'Asnjë material nuk përputhet me kërkimin',
    'storage.noMatchHint': 'Provo një kërkim tjetër.',
    'storage.unit': 'Njësia',
    'storage.currentStock': 'Stoku Aktual',
    'storage.adjustStock': 'Rregullo Stokun',
    'storage.addRawMaterial': 'Shto Lëndë të Parë',
    'storage.materialPlaceholder': 'Emri i materialit (p.sh., PVC, PP, Kuti Kartoni A)',
    'storage.unitOfMeasurement': 'Njësia e matjes',
    'storage.grams': 'Gram (g)',
    'storage.kilograms': 'Kilogram (kg)',
    'storage.unitsLabel': 'Njësi',
    'storage.meters': 'Metra',
    'storage.liters': 'Litra',
    'storage.sheets': 'Fletë',
    'storage.addStock': 'Shto Stok',
    'storage.removeStock': 'Hiq Stok',
    'storage.reasonPlaceholder': 'Arsyeja (opsionale)',
    'storage.newStockWillBe': 'Stoku i ri do të jetë:',
    'storage.adjusting': 'Duke rregulluar...',
    'storage.editRawMaterial': 'Ndrysho Lëndën e Parë',
    'storage.materialName': 'Emri i materialit',
    'storage.saving': 'Duke ruajtur...',
    'storage.creating': 'Duke krijuar...',
  },

  mk: {
    'app.title': 'Управување со Производство',
    'app.signedIn': 'Најавен како',
    'app.logout': 'Одјави се',
    'app.version': 'в',
    'app.updateDownloading': 'се презема...',
    'app.updateRestart': 'Ажурирај — Рестартирај',

    'nav.products': 'Производи',
    'nav.elements': 'Елементи',
    'nav.orders': 'Нарачки',
    'nav.production': 'Производство',
    'nav.inventory': 'Инвентар',
    'nav.storage': 'Складиште',
    'nav.stock': 'Залиха',

    'common.refresh': 'Освежи',
    'common.save': 'Зачувај',
    'common.cancel': 'Откажи',
    'common.delete': 'Избриши',
    'common.close': 'Затвори',
    'common.add': 'Додај',
    'common.edit': 'Уреди',
    'common.print': 'Печати',
    'common.search': 'Барај',
    'common.loading': 'Се вчитува...',
    'common.confirm': 'Потврди?',
    'common.done': 'Готово',
    'common.all': 'Сите',
    'common.yes': 'Да',
    'common.no': 'Не',
    'common.boxes': 'кутии',
    'common.box': 'кутија',
    'common.units': 'единици',
    'common.inStock': 'на залиха',
    'common.total': 'Вкупно',
    'common.complete': 'Завршено',

    'orders.title': 'Нарачки',
    'orders.newOrder': 'Нова Нарачка',
    'orders.searchPlaceholder': 'Барај по клиент или #...',
    'orders.noOrders': 'Нема нарачки',
    'orders.noOrdersHint': 'Кликнете "Нова Нарачка" за да ја креирате првата нарачка.',
    'orders.noMatch': 'Нема нарачки што одговараат',
    'orders.noMatchHint': 'Пробајте друг статус или термин за пребарување.',
    'orders.pending': 'Во чекање',
    'orders.inProduction': 'Во производство',
    'orders.shipped': 'Испратена',
    'orders.created': 'Креирана',
    'orders.products': 'производи',
    'orders.produce': 'Произведи',
    'orders.ship': 'Испрати',
    'orders.confirmShip': 'Потврди испраќање?',
    'orders.confirmDelete': 'Потврди?',
    'orders.shipping': 'Се испраќа...',
    'orders.starting': 'Се стартува...',
    'orders.deleting': 'Се брише...',
    'orders.shippedOn': 'Испратена',
    'orders.stockAutoApplied': 'Залихата е автоматски применета:',
    'orders.fromStock': 'од залиха',
    'orders.editOrder': 'Уреди нарачка',
    'orders.cannotEditShipped': 'Испратените нарачки не може да се уредуваат',
    'orders.notes': 'Белешки',
    'orders.addProducts': 'Додај Производи',
    'orders.selectProducts': 'Изберете производи и одредете потребни кутии',
    'orders.boxesNeeded': 'Потребни кутии',
    'orders.finalize': 'Готово — Финализирај Нарачка',
    'orders.finalizing': 'Се финализира...',
    'orders.itemsInOrder': 'во нарачка',
    'orders.addToOrder': 'Додај во Нарачка',
    'orders.added': 'Додадено',
    'orders.alreadyAdded': 'Овој производ е веќе додаден во нарачката.',
    'orders.unitsTotal': 'единици вкупно',
    'orders.clientName': 'Име на клиент',

    'orderDetail.productsInOrder': 'Производи во Нарачка',
    'orderDetail.noProducts': 'Нема производи во оваа нарачка.',

    'production.title': 'Нарачки за Производство',
    'production.subtitle': 'Следете го напредокот на производство на елементи за нарачки во производство',
    'production.totalRequirements': 'Вкупни Потреби',
    'production.aggregated': 'Агрегирано од сите нарачки',
    'production.noOrders': 'Нема нарачки во производство',
    'production.noOrdersHint': 'Поставете го статусот на нарачката на "Во Производство" од табот Нарачки.',
    'production.noData': 'Нема податоци за производство',
    'production.need': 'Потребно',
    'production.inStock': 'На Залиха',
    'production.remaining': 'Преостанато',
    'production.weight': 'Тежина',
    'production.totalWeight': 'Вкупна тежина',
    'production.elementTypes': 'типови елементи',
    'production.printAssembly': 'Печати лист за склопување',
    'production.assemblySheet': 'Лист за Склопување',
    'production.productionPrint': 'Печатење на Производство',
    'production.qty': 'Кол.',
    'production.applyInventory': 'Примени Инвентар',
    'production.allocated': 'Алоцирано',
    'production.excess': 'Вишок',
    'production.noExcess': 'Нема достапен вишок',
    'production.applySuccess': 'Инвентарот е успешно применет',
    'production.applyFailed': 'Неуспешно применување на инвентар',

    'inventory.title': 'Инвентар на Елементи',
    'inventory.subtitle': 'Тековна залиха на произведени елементи',
    'inventory.noElements': 'Нема елементи во инвентарот',
    'inventory.noElementsHint': 'Регистрирајте производство во табот Производство за да додадете елементи.',
    'inventory.assembly': 'Склопување',
    'inventory.assemblySubtitle': 'Забележете склопени кутии денеска',
    'inventory.noOrdersInProduction': 'Нема нарачки во производство',
    'inventory.recordBoxes': 'Забележете склопени кутии денеска',
    'inventory.excessAssembly': 'Вишок Склопување',
    'inventory.excessSubtitle': 'Производи кои можете да ги склопите од преостанат инвентар',
    'inventory.finishOrdersFirst': 'Прво завршете ги нарачките',
    'inventory.canAssemble': 'Може да склопите',
    'inventory.extraBoxes': 'додатни',
    'inventory.addMax': 'Додај (макс',
    'inventory.deleteConfirm': 'Избриши инвентар за',
    'inventory.addManual': 'Додај Инвентар',
    'inventory.element': 'Елемент',
    'inventory.searchElement': 'Пребарај елементи...',
    'inventory.noElementsMatch': 'Нема совпаѓачки елементи',
    'inventory.selected': 'Избрано',
    'inventory.quantity': 'Количина',
    'inventory.enterQuantity': 'Внесете количина',
    'inventory.addToInventory': 'Додај во Инвентар',
    'inventory.selectElement': 'Ве молиме изберете елемент',
    'inventory.validQuantity': 'Внесете валидна количина (≥ 1)',
    'inventory.removeQuantity': 'Отстрани количина',
    'inventory.removeFromInventory': 'Отстрани',
    'inventory.removeSuccess': 'Инвентарот е успешно ажуриран',
    'inventory.maxRemove': 'Макс',

    'stock.title': 'Преглед на Залиха',
    'stock.subtitle': 'Завршени кутии по нарачка и вишок залиха',
    'stock.noData': 'Нема податоци за залиха',
    'stock.noDataHint': 'Склопете кутии во табот Инвентар за да ја видите залихата тука.',
    'stock.excessStock': 'Вишок Залиха',
    'stock.excessSubtitle': 'Кутии склопени од вишок инвентар (автоматски се применуваат на нови нарачки)',
    'stock.excessSubtitleManual': 'Кутии склопени од вишок инвентар (применете мануелно на нарачки со копчиња)',
    'stock.noExcess': 'Нема вишок залиха',
    'stock.noExcessHint': 'Склопете вишок кутии од табот Инвентар за да создадете залиха.',
    'stock.totalBoxes': 'вкупно кутии',
    'stock.orderComplete': 'Нарачка завршена — подготвена за испраќање',
    'stock.orderIncomplete': 'Не сите производи се склопени',
    'stock.applyFromStock': 'Примени од залиха',
    'stock.available': 'достапни',
    'stock.apply': 'Примени',
    'stock.applyFailed': 'Неуспешно применување на залиха на нарачка',

    'storage.title': 'Складиште',
    'storage.rawMaterials': 'Суровини',

    'products.title': 'Производи',
    'products.newProduct': 'Нов Производ',

    'elements.title': 'Елементи',
    'elements.newElement': 'Нов Елемент',

    'print.assemblySheet': 'Лист за Склопување',
    'print.preview': 'Преглед на Лист за Склопување',
    'print.previewHint': 'A4 Пејзаж · Кликнете на копчето за печатење',
    'print.printBtn': 'Печати',
    'print.serialNumber': 'Сериски Број',
    'print.product': 'Производ',
    'print.label': 'Етикета',
    'print.date': 'Датум',
    'print.productionPrintPreview': 'Преглед на Печатење на Производство',
    'print.productionPrintHint': 'Пејзаж A4 · Кликнете на копчето за печатење',
    'print.orderOf': 'Нарачка',
    'print.totalRequirements': 'Вкупни Потреби — Сите Нарачки',
    'print.ordersInProduction': 'нарачки во производство',
    'print.labeledElements': 'Етикетирани Елементи',

    'auth.startingApp': 'Се стартува апликацијата...',
    'auth.createAccount': 'Креирај Сметка',
    'auth.signIn': 'Најави се',
    'auth.createAccountSubtitle': 'Креирајте ја вашата сметка за да започнете',
    'auth.signInSubtitle': 'Најавете се на вашата сметка',
    'auth.username': 'Корисничко име',
    'auth.usernamePlaceholder': 'Внесете корисничко име',
    'auth.password': 'Лозинка',
    'auth.passwordPlaceholder': 'Внесете лозинка',
    'auth.confirmPassword': 'Потврди Лозинка',
    'auth.confirmPasswordPlaceholder': 'Повторно внесете лозинка',
    'auth.pleaseWait': 'Ве молиме почекајте...',
    'auth.alreadyHaveAccount': 'Веќе имате сметка?',
    'auth.needAccount': 'Ви треба сметка?',
    'auth.usernameRequired': 'Корисничко име е задолжително',
    'auth.usernameMinLength': 'Корисничкото име мора да биде најмалку 3 карактери',
    'auth.passwordRequired': 'Лозинката е задолжителна',
    'auth.passwordMinLength': 'Лозинката мора да биде најмалку 4 карактери',
    'auth.passwordsNoMatch': 'Лозинките не се совпаѓаат',
    'auth.registrationFailed': 'Регистрацијата не успеа. Обидете се повторно.',
    'auth.loginFailed': 'Најавата не успеа. Обидете се повторно.',
    'auth.requiresDesktop': 'Ова бара десктоп апликација.',

    'createOrder.title': 'Нова Нарачка',
    'createOrder.clientPlaceholder': 'Внесете име на клиент',
    'createOrder.initialStatus': 'Почетен Статус',
    'createOrder.notesPlaceholder': 'Белешки за оваа нарачка...',
    'createOrder.clientRequired': 'Името на клиентот е задолжително.',
    'createOrder.creating': 'Се креира...',
    'createOrder.create': 'Креирај Нарачка',

    'createElement.title': 'Нов Елемент',
    'createElement.name': 'Име',
    'createElement.namePlaceholder': 'пр. Кофа, Лопата',
    'createElement.labelPlaceholder': 'Групира во прегледот на производство',
    'createElement.material': 'Материјал',
    'createElement.materialPlaceholder': 'Пластика, Метал...',
    'createElement.weight': 'Тежина (г)',
    'createElement.dualColor': 'Елемент со две бои',
    'createElement.creating': 'Се креира...',
    'createElement.nameRequired': 'Името е задолжително',
    'createElement.materialRequired': 'Материјалот е задолжителен',
    'createElement.weightRequired': 'Тежината мора да биде > 0',
    'createElement.selectColor': 'Изберете боја',
    'createElement.selectSecondColor': 'Изберете втора боја',

    'createProduct.title': 'Нов Производ',
    'createProduct.serialNumber': 'Сериски Број',
    'createProduct.serialPlaceholder': 'пр. BKT-001',
    'createProduct.labelPlaceholder': 'пр. Премиум Црвена Кофа',
    'createProduct.category': 'Категорија',
    'createProduct.selectCategory': 'Изберете...',
    'createProduct.newCategory': '+ Нова',
    'createProduct.newCategoryPlaceholder': 'Име на нова категорија',
    'createProduct.unitsPerBox': 'Единици/Кутија',
    'createProduct.boxType': 'Тип на кутија (за одземање при склопување)',
    'createProduct.noBoxDeduction': 'Нема (без одземање на кутија)',
    'createProduct.imageRequired': 'Слика *',
    'createProduct.creating': 'Се креира...',
    'createProduct.create': 'Креирај Производ',
    'createProduct.serialRequired': 'Серискиот број е задолжителен',
    'createProduct.categoryRequired': 'Категоријата е задолжителна',
    'createProduct.imageReq': 'Сликата на производот е задолжителна',
    'createProduct.unitsError': 'Единиците по кутија мора да бидат најмалку 1',

    'orderItems.addedProducts': 'Додадени Производи',
    'orderItems.searchPlaceholder': 'Пребарај производи по сериски број или категорија...',
    'orderItems.loadingProducts': 'Се вчитуваат производите...',
    'orderItems.noProducts': 'Не се пронајдени производи. Креирајте прво производи.',
    'orderItems.noMatch': 'Нема производи што одговараат на пребарувањето.',
    'orderItems.boxesOf': 'Кутии од',
    'orderItems.adding': 'Се додава...',

    'productElements.title': 'Изберете Елементи',
    'productElements.chooseFor': 'Изберете елементи за',
    'productElements.searchPlaceholder': 'Пребарај елементи по име, боја или материјал...',
    'productElements.noMatch': 'Нема елементи што одговараат на пребарувањето',
    'productElements.noElements': 'Нема достапни елементи',
    'productElements.qty': 'Кол.',
    'productElements.saving': 'Се зачувува...',
    'productElements.saveElements': 'Зачувај Елементи',

    'productCard.noImage': 'Нема слика',
    'productCard.more': 'повеќе',
    'productCard.noElements': 'Нема елементи',
    'productCard.sure': 'Сигурни?',
    'productCard.clone': 'Клонирај',

    'update.checkFailed': 'Проверката за Ажурирање Не Успеа',
    'update.checkFailedMsg': 'Не успеа проверката за ажурирања',
    'update.available': 'Достапно Ажурирање',
    'update.availableMsg': 'е достапна. Се презема во позадина...',
    'update.downloading': 'Се презема...',
    'update.downloadingTitle': 'Се Презема Ажурирањето',
    'update.downloaded': 'преземено',
    'update.readyTitle': 'Ажурирањето е Подготвено',
    'update.readyMsg': 'е преземено и подготвено за инсталирање.',
    'update.restartInstall': 'Рестартирај и Инсталирај',
    'update.installing': 'Се инсталира...',
    'update.later': 'Подоцна',

    'storage.subtitle': 'Управувајте со нивоата на залиха на суровини',
    'storage.addMaterial': 'Додај Материјал',
    'storage.noMaterials': 'Нема суровини засега',
    'storage.noMaterialsHint': 'Кликнете "Додај Материјал" за да додадете прва суровина.',
    'storage.noMatch': 'Нема материјали што одговараат',
    'storage.noMatchHint': 'Пробајте друг термин за пребарување.',
    'storage.unit': 'Единица',
    'storage.currentStock': 'Тековна Залиха',
    'storage.adjustStock': 'Прилагоди Залиха',
    'storage.addRawMaterial': 'Додај Суровина',
    'storage.materialPlaceholder': 'Име на материјал (пр. PVC, PP, Картонска кутија A)',
    'storage.unitOfMeasurement': 'Единица за мерење',
    'storage.grams': 'Грамови (г)',
    'storage.kilograms': 'Килограми (кг)',
    'storage.unitsLabel': 'Единици',
    'storage.meters': 'Метри',
    'storage.liters': 'Литри',
    'storage.sheets': 'Листови',
    'storage.addStock': 'Додај Залиха',
    'storage.removeStock': 'Отстрани Залиха',
    'storage.reasonPlaceholder': 'Причина (опционално)',
    'storage.newStockWillBe': 'Нова залиха ќе биде:',
    'storage.adjusting': 'Се прилагодува...',
    'storage.editRawMaterial': 'Уреди Суровина',
    'storage.materialName': 'Име на материјал',
    'storage.saving': 'Се зачувува...',
    'storage.creating': 'Се креира...',
  },
};

// ============================================================================
// CONTEXT & HOOK
// ============================================================================

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof TranslationKeys) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = 'productionapp-lang';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (stored && translations[stored]) return stored;
    }
    return 'en';
  });

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newLang);
    }
  }, []);

  const t = useCallback((key: keyof TranslationKeys): string => {
    return translations[lang]?.[key] ?? translations.en[key] ?? key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

// ============================================================================
// LANGUAGE PICKER COMPONENT
// ============================================================================

export function LanguagePicker() {
  const { lang, setLang } = useI18n();

  return (
    <div className="flex items-center gap-1">
      {LANGUAGES.map(l => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`rounded-md px-1.5 py-0.5 text-xs font-medium transition-colors ${
            lang === l.code
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
              : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-300 dark:hover:bg-zinc-800'
          }`}
          title={l.label}
        >
          {l.flag}
        </button>
      ))}
    </div>
  );
}
