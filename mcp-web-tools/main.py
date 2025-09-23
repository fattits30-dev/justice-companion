#!/usr/bin/env python3
"""
MCP Server for Web Operations
Focused server for web scraping, API requests, and HTTP operations.
"""

from typing import Literal, Dict, Any, Optional
from fastmcp import FastMCP

mcp = FastMCP(
    name='mcp-web-tools',
    instructions='Web operations server for scraping, API requests, and HTTP operations.'
)

@mcp.tool(name='web-scrape', description='Scrape webpage content and convert to markdown')
def web_scrape(url: str, include_links: bool = True) -> str:
    """Scrape webpage"""
    try:
        import requests
        from markdownify import markdownify

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

        response = requests.get(url, timeout=10, headers=headers)
        response.raise_for_status()

        # Convert HTML to markdown - using basic conversion to avoid parameter conflicts
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove unwanted tags
        for tag in soup(['script', 'style', 'meta', 'link', 'noscript']):
            tag.decompose()
            
        # Convert to markdown
        content = markdownify(str(soup))

        return f'Scraped contents of {url}:\n{content}'
    except Exception as e:
        return f"Error scraping {url}: {str(e)}"

@mcp.tool(name='api-request', description='Make HTTP API request')
def api_request(
    url: str,
    method: Literal['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] = 'GET',
    headers: Optional[Dict[str, str]] = None,
    data: Optional[Dict[str, Any]] = None,
    params: Optional[Dict[str, str]] = None
) -> str:
    """Make API request"""
    try:
        import requests

        response = requests.request(
            method=method,
            url=url,
            headers=headers or {},
            json=data,
            params=params,
            timeout=10
        )

        result = f"Status: {response.status_code}\n"
        result += f"Headers: {dict(response.headers)}\n"

        try:
            # Try to parse as JSON
            json_data = response.json()
            result += f"JSON Response: {json_data}"
        except:
            # Fall back to text
            result += f"Response: {response.text[:1000]}..."

        return result
    except Exception as e:
        return f"Error making API request: {str(e)}"

@mcp.tool(name='download-file', description='Download file from URL')
def download_file(url: str, filename: str) -> str:
    """Download file from URL"""
    try:
        import requests

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }

        response = requests.get(url, timeout=30, headers=headers, stream=True)
        response.raise_for_status()

        with open(filename, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        return f"Downloaded {url} to {filename}"
    except Exception as e:
        return f"Error downloading file: {str(e)}"

@mcp.tool(name='check-url-status', description='Check if URL is accessible')
def check_url_status(url: str) -> str:
    """Check URL status"""
    try:
        import requests

        response = requests.head(url, timeout=10, allow_redirects=True)

        result = f"URL: {url}\n"
        result += f"Status Code: {response.status_code}\n"
        result += f"Final URL: {response.url}\n"
        result += f"Content-Type: {response.headers.get('content-type', 'Unknown')}\n"
        result += f"Content-Length: {response.headers.get('content-length', 'Unknown')}\n"

        return result
    except Exception as e:
        return f"Error checking URL {url}: {str(e)}"

@mcp.tool(name='extract-links', description='Extract all links from webpage')
def extract_links(url: str, filter_domain: bool = False) -> str:
    """Extract links from webpage"""
    try:
        import requests
        from bs4 import BeautifulSoup
        from urllib.parse import urljoin, urlparse

        response = requests.get(url, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')
        links = []

        domain = urlparse(url).netloc if filter_domain else None

        for link in soup.find_all('a', href=True):
            href = link['href']
            full_url = urljoin(url, href)

            if filter_domain and urlparse(full_url).netloc != domain:
                continue

            link_text = link.get_text(strip=True)
            links.append(f"{full_url} - {link_text}")

        return f"Found {len(links)} links on {url}:\n" + "\n".join(links)
    except Exception as e:
        return f"Error extracting links from {url}: {str(e)}"

@mcp.tool(name='web-search', description='Search the web using DuckDuckGo')
def web_search(query: str, max_results: int = 10) -> str:
    """Search the web"""
    try:
        import requests
        from bs4 import BeautifulSoup
        from urllib.parse import unquote

        # Use DuckDuckGo HTML search instead of limited instant answer API
        url = "https://html.duckduckgo.com/html/"
        params = {'q': query}
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

        response = requests.post(url, data=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        result = f"Search results for: {query}\n\n"
        
        # Find all search result links
        results = soup.select('.result__body')
        
        if not results:
            # Fallback to finding any links if structure changed
            results = soup.find_all('div', class_='result')
        
        count = 0
        for item in results[:max_results]:
            count += 1
            
            # Extract title
            title_elem = item.select_one('.result__title, .result__a')
            title = title_elem.get_text(strip=True) if title_elem else 'No title'
            
            # Extract URL
            link_elem = item.select_one('a.result__a, a')
            link = link_elem['href'] if link_elem and 'href' in link_elem.attrs else 'No URL'
            
            # Extract snippet
            snippet_elem = item.select_one('.result__snippet')
            snippet = snippet_elem.get_text(strip=True) if snippet_elem else 'No description'
            
            result += f"{count}. {title}\n"
            result += f"   URL: {link}\n"
            result += f"   {snippet}\n\n"
        
        if count == 0:
            result += "No results found. The search API may have changed or the query returned no results.\n"
        
        return result
    except Exception as e:
        return f"Error searching web: {str(e)}"

if __name__ == "__main__":
    mcp.run()