// Generic page content extraction functionality
import { persistentLogger } from '../utils/logger';

interface Product {
  name: string | null;
  price: string | null;
  imageUrl: string | null;
  // Add other relevant product details here
}

interface PageContent {
  title: string;
  description: string;
  mainContent: string;
  visibleText: string;
  url: string;
  metadata: {
    [key: string]: string;
  };
  products?: Product[]; // Add optional products array
}

// Get page title
export function getPageTitle(): string {
  try {
    const title = document.title || '';
    persistentLogger.log('Page title extracted:', title);
    return title;
  } catch (error) {
    persistentLogger.error('Error extracting page title:', error);
    return '';
  }
}

// Get page description
export function getPageDescription(): string {
  try {
    // Try meta description first
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');
    if (metaDescription) {
      persistentLogger.log('Meta description found');
      return metaDescription;
    }

    // Try OpenGraph description
    const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
    if (ogDescription) {
      persistentLogger.log('OpenGraph description found');
      return ogDescription;
    }

    // Fallback to first paragraph
    const firstParagraph = document.querySelector('p')?.textContent?.trim();
    if (firstParagraph) {
      persistentLogger.log('Using first paragraph as description');
      return firstParagraph;
    }

    return '';
  } catch (error) {
    persistentLogger.error('Error extracting page description:', error);
    return '';
  }
}

// Get main content
export function getMainContent(): string {
  try {
    // Clone the body element to avoid modifying the live DOM
    const bodyClone = document.body.cloneNode(true) as HTMLBodyElement;

    // Remove script and style elements from the clone
    bodyClone.querySelectorAll('script, style').forEach(el => el.remove());

    // Extract text content from the modified clone
    const text = bodyClone.textContent?.trim() || '';

    persistentLogger.log('Main content extracted from modified body, length:', text.length);
    return text;
  } catch (error) {
    persistentLogger.error('Error extracting main content from modified body:', error);
    return '';
  }
}

// Get all metadata
export function getMetadata(): { [key: string]: string } {
  try {
    const metadata: { [key: string]: string } = {};
    
    // Get all meta tags
    document.querySelectorAll('meta').forEach(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property');
      const content = meta.getAttribute('content');
      if (name && content) {
        metadata[name] = content;
      }
    });

    // Get structured data if available
    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
      try {
        const data = JSON.parse(script.textContent || '{}');
        Object.assign(metadata, data);
      } catch (e) {
        persistentLogger.error('Error parsing structured data:', e);
      }
    });

    persistentLogger.log('Metadata extracted:', Object.keys(metadata).length);
    return metadata;
  } catch (error) {
    persistentLogger.error('Error extracting metadata:', error);
    return {};
  }
}

// Attempt to extract product information from the page
export function extractProducts(): Product[] {
  const products: Product[] = [];
  try {
    // Common selectors for product listings (can be expanded)
    const productSelectors = [
      '.product-item',
      '.product-card',
      '.js-product-list-item',
      '.grid-product',
      '.product-container',
      '.item-card',
    ];

    let productElements: NodeListOf<Element> | null = null;

    // Try finding product elements using different selectors
    for (const selector of productSelectors) {
      productElements = document.querySelectorAll(selector);
      if (productElements && productElements.length > 0) {
        persistentLogger.log(`Found ${productElements.length} product elements using selector: ${selector}`);
        break; // Use the first selector that finds elements
      }
    }

    if (!productElements || productElements.length === 0) {
      persistentLogger.warn('No common product elements found.');
      return products; // Return empty array if no products found
    }

    productElements.forEach(productEl => {
      try {
        // Attempt to extract common product details within each element
        const nameEl = productEl.querySelector('h2, h3, .product-title, .item-name');
        const priceEl = productEl.querySelector('.price, .product-price, .item-price, [data-price]');
        const imgEl = productEl.querySelector('img.product-image, img.item-image');

        const name = nameEl?.textContent?.trim() || null;
        const price = priceEl?.textContent?.trim() || priceEl?.getAttribute('data-price') || null;
        const imageUrl = imgEl?.getAttribute('src') || null;

        if (name || price || imageUrl) { // Only add if at least one detail is found
          products.push({
            name,
            price,
            imageUrl,
            // Extract other details if needed
          });
        }
      } catch (e) {
        persistentLogger.error('Error processing individual product element:', e);
      }
    });

    persistentLogger.log(`Extracted ${products.length} product details.`);
    return products;

  } catch (error) {
    persistentLogger.error('Error extracting products:', error);
    return [];
  }
}

// Get text content from elements currently visible in the viewport
export function getVisibleText(): string {
  const visibleText: string[] = [];
  try {
    // Select common text-containing elements. Including div again but will clean their content.
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, span, div, a');

    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

    textElements.forEach(el => {
      const rect = el.getBoundingClientRect();

      // Check if the element is at least partially within the viewport
      const isVisible = (
        rect.top < viewportHeight &&
        rect.bottom > 0 &&
        rect.left < viewportWidth &&
        rect.right > 0
      );

      if (isVisible) {
        // Clone the element to avoid modifying the live DOM
        const elClone = el.cloneNode(true) as HTMLElement;

        // Remove script, style, and comment nodes from the clone and its children
        elClone.querySelectorAll('script, style').forEach(codeEl => codeEl.remove());
        // Remove comment nodes - need to traverse for these as querySelectorAll doesn't find them
        const removeCommentNodes = (node: Node) => {
          for (let i = node.childNodes.length - 1; i >= 0; i--) {
            const child = node.childNodes[i];
            if (child.nodeType === Node.COMMENT_NODE) {
              child.remove();
            } else if (child.nodeType === Node.ELEMENT_NODE) {
              removeCommentNodes(child); // Recurse for element nodes
            }
          }
        };
        removeCommentNodes(elClone);

        // Extract text content from the cleaned clone
        const text = elClone.textContent?.trim();

        // Basic check to avoid adding empty strings or potentially non-prose text that remains
        if (text && text.length > 1) { // Require more than 1 character
           visibleText.push(text);
        }
      }
    });

    // Join with space, normalize whitespace, and trim
    const combinedText = visibleText.join(' ').replace(/\s+/g, ' ').trim();
    persistentLogger.log('Visible text extracted (enhanced cleaning), length:', combinedText.length);
    return combinedText;

  } catch (error) {
    persistentLogger.error('Error extracting visible text (enhanced cleaning):', error);
    return '';
  }
}

// Get all page content
export function getAllPageContent(): PageContent {
  persistentLogger.log('Extracting all page content...');
  
  const content: PageContent = {
    title: getPageTitle(),
    description: getPageDescription(),
    mainContent: getMainContent(),
    visibleText: getVisibleText(),
    url: window.location.href,
    metadata: getMetadata(),
    products: extractProducts() // Include extracted products
  };

  // Log the full content object with prefix
  persistentLogger.log('mod Qaisar -> "All the content "', content);

  // Log the visible text
  persistentLogger.log('mod Qaisar -> "Visible Text"', content.visibleText);

  // Log extracted products
  if (content.products && content.products.length > 0) {
    persistentLogger.log('mod Qaisar -> "Extracted Products"', content.products);
  } else {
    persistentLogger.log('mod Qaisar -> "No Products Extracted"');
  }

  persistentLogger.log('Page content extracted summary:', {
    title: content.title,
    descriptionLength: content.description.length,
    mainContentLength: content.mainContent.length,
    visibleTextLength: content.visibleText.length,
    metadataCount: Object.keys(content.metadata).length,
    productCount: content.products?.length || 0 // Log product count
  });

  return content;
}

// Initialize page content extraction
export function initializePageExtraction() {
  persistentLogger.log('Initializing page content extraction...');

  // Set up observer for content changes
  const contentObserver = new MutationObserver(() => {
    const content = getMainContent();
    persistentLogger.log('Content updated, new length:', content.length);
  });

  // Observe body for changes
  contentObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
  persistentLogger.log('Content change observer initialized');

  // Initial content extraction
  const initialContent = getAllPageContent();
  persistentLogger.log('Initial page content extracted:', {
    title: initialContent.title,
    url: initialContent.url,
    descriptionLength: initialContent.description.length,
    mainContentLength: initialContent.mainContent.length,
    visibleTextLength: initialContent.visibleText.length,
    metadataCount: Object.keys(initialContent.metadata).length
  });

  return {
    stop: () => {
      contentObserver.disconnect();
      persistentLogger.log('Page content observer stopped');
    }
  };
} 