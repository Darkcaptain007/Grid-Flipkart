import { useState, useEffect, useRef, useContext } from 'react';
import { InputBase, List, ListItem, Typography, makeStyles, Box } from '@material-ui/core';
import { Search as SearchIcon, History as HistoryIcon } from '@material-ui/icons';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import DOMPurify from 'dompurify';
import { LoginContext } from '../../context/ContextProvider';

const useStyle = makeStyles(theme => ({
  search: {
    borderRadius: 2,
    marginLeft: 10,
    width: '560px', // Using a fixed width to match Flipkart's stable layout
    backgroundColor: '#f0f2f5',
    display: 'flex',
    // --- THIS IS THE FIX ---
    position: 'relative', // This makes the search bar the anchor for the dropdown
  },
  searchIconWrapper: {
    padding: '5px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#2874f0',
    cursor: 'pointer',
  },
  inputRoot: {
    fontSize: '14px',
    width: '100%'
  },
  inputInput: {
    paddingLeft: 20,
    width: '100%',
  },
  listWrapper: {
    position: 'absolute',
    color: '#000',
    background: '#fff',
    top: 36, // Position it just below the search bar
    width: '100%', // Now this is 100% of the search bar's width
    borderRadius: '0 0 2px 2px',
    boxShadow: '0 2px 4px 0 rgb(0 0 0 / 20%)',
    borderTop: '1px solid #e0e0e0'
  },
  listItem: {
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    '&:hover': {
      backgroundColor: '#f8f9fa'
    }
  },
  suggestionText: {
    fontSize: '14px',
    color: '#212121',
  },
  suggestionType: {
    fontSize: '12px',
    color: '#878787',
    marginLeft: 'auto'
  },
  icon: {
    color: '#878787'
  }
}));

const Search = () => {
  const classes = useStyle();
  const history = useHistory();
  const [text, setText] = useState('');
  const [results, setResults] = useState([]);
  const suggestionCache = useRef(new Map());
  const { account } = useContext(LoginContext);

  // --- All your existing logic is preserved ---
  useEffect(() => {
    if (!text) {
      setResults([]);
      return;
    }
    const fetchSuggestions = async () => {
      if (suggestionCache.current.has(text)) {
        setResults(suggestionCache.current.get(text));
        return;
      }
      try {
        const { data } = await axios.get(
          `http://localhost:8000/autosuggest?q=${encodeURIComponent(text)}${account ? `&userId=${encodeURIComponent(account)}` : ''}`
        );
        setResults(data.slice(0, 8));
        suggestionCache.current.set(text, data.slice(0, 8));
      } catch (error) {
        console.error("Autosuggest API call failed:", error);
        setResults([]);
      }
    };
    const timeoutId = setTimeout(fetchSuggestions, 400);
    return () => clearTimeout(timeoutId);
  }, [text, account]);

  const handleTextChange = e => setText(e.target.value);
  const clearSearch = () => { setText(''); setResults([]); };

  const onSuggestionClick = async (suggestion) => {
    if (suggestion.type === 'product') {
      if (account && suggestion.id) {
        try { await axios.post('http://localhost:8000/click', { userId: account, productId: suggestion.id }); }
        catch (e) { console.error('Click tracking failed:', e); }
      }
      history.push(`/product/${suggestion.id}`);
    } else {
      let searchTarget = '';
      let displayQuery = '';
      if (suggestion.type === 'search_term') {
        searchTarget = suggestion.subcategory;
        displayQuery = suggestion.name;
      } else {
        searchTarget = suggestion.name;
        displayQuery = suggestion.name;
      }
      if (searchTarget && account) {
        try { await axios.post('http://localhost:8000/click', { userId: account, category: searchTarget }); }
        catch (e) { console.error('Category/Term click tracking failed:', e); }
      }
      history.push(`/search?q=${encodeURIComponent(searchTarget)}&oq=${encodeURIComponent(displayQuery)}`);
    }
    clearSearch();
  };

  const handleSearch = () => {
    const query = text.trim();
    if (!query) return;
    const topSuggestion = results?.[0];
    if (topSuggestion && topSuggestion.type === 'product' && topSuggestion.title?.longTitle) {
      const highlightedHTML = topSuggestion.title.longTitle;
      const match = highlightedHTML.match(/<strong>(.*?)<\/strong>/i);
      const correctedKeyword = match ? match[1] : query;
      history.push(`/search?q=${encodeURIComponent(correctedKeyword)}&oq=${encodeURIComponent(query)}`);
    } else if (topSuggestion && topSuggestion.type !== 'product') {
      onSuggestionClick(topSuggestion);
    } else {
      history.push(`/search?q=${encodeURIComponent(query)}&oq=${encodeURIComponent(query)}`);
    }
    clearSearch();
  };

  return (
    <Box className={classes.search}>
      <InputBase
        placeholder="Search for products, brands and more"
        classes={{ root: classes.inputRoot, input: classes.inputInput }}
        value={text}
        onChange={handleTextChange}
        onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
      />
      <Box className={classes.searchIconWrapper} onClick={handleSearch}><SearchIcon /></Box>
      
      {results.length > 0 && (
        <List className={classes.listWrapper}>
          {results.map((suggestion, index) => (
            <ListItem
              button
              key={`${suggestion.type}-${index}`}
              onClick={() => onSuggestionClick(suggestion)}
              className={classes.listItem}
            >
              {suggestion.type === 'product' ? (
                <>
                  <SearchIcon className={classes.icon} />
                  <Typography className={classes.suggestionText}>
                    {suggestion.title.longTitle.replace(/<[^>]+>/g, '')}
                  </Typography>
                  <Typography className={classes.suggestionType}>
                    {suggestion.title.shortTitle}
                  </Typography>
                </>
              ) : (
                <>
                  <HistoryIcon className={classes.icon} />
                  <Typography className={classes.suggestionText}>
                    {suggestion.name}
                  </Typography>
                  <Typography className={classes.suggestionType}>
                    in {suggestion.type === 'search_term' ? suggestion.subcategory : suggestion.type}
                  </Typography>
                </>
              )}
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default Search;