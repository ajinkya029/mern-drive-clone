import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Cloud,
  Search,
  Plus,
  Upload,
  FolderPlus,
  Grid2X2,
  List,
  Star,
  Trash2,
  HardDrive,
  Clock3,
  Menu,
  X,
  MoreHorizontal,
  Download,
  Share2,
  Pencil,
  Folder,
  File as FileIcon,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  Film,
  Music2,
  ChevronRight,
  ChevronLeft,
  LogOut,
  RotateCcw,
  Check,
  Copy,
  LayoutGrid,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const fmtSize = (n) =>
  n < 1024
    ? `${n} B`
    : n < 1048576
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1048576).toFixed(1)} MB`;

const fmtDate = (d) =>
  new Date(d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const iconFor = (item) => {
  if (item.isFolder) return Folder;
  if (item.mimeType?.startsWith('image/')) return ImageIcon;
  if (item.mimeType?.startsWith('video/')) return Film;
  if (item.mimeType?.startsWith('audio/')) return Music2;
  if (item.mimeType?.includes('pdf') || item.mimeType?.includes('text'))
    return FileText;
  if (item.mimeType?.includes('sheet') || item.mimeType?.includes('excel'))
    return FileSpreadsheet;
  return FileIcon;
};

export default function DrivePage() {
  const { user, logout } = useAuth();
  const [items, setItems] = useState([]);
  const [view, setView] = useState('all');
  const [parent, setParent] = useState(null);
  const [crumbs, setCrumbs] = useState([]);
  const [query, setQuery] = useState('');
  const [layout, setLayout] = useState('grid');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState(null);
  const [notice, setNotice] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.get('/files', {
        params: { parent: parent || '', q: query, view },
      });
      setItems(data.items);
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to load files');
    } finally {
      setBusy(false);
    }
  }, [parent, query, view]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  const navigate = (folder) => {
    setParent(folder._id);
    setCrumbs([...crumbs, { _id: folder._id, name: folder.name }]);
    setView('all');
    setQuery('');
  };

  const goCrumb = (index) => {
    if (index < 0) {
      setParent(null);
      setCrumbs([]);
    } else {
      setParent(crumbs[index]._id);
      setCrumbs(crumbs.slice(0, index + 1));
    }
  };

  const action = async (id, body, method = 'patch') => {
    try {
      await api[method](`/files/${id}`, body);
      await load();
      setNotice('Changes saved');
      setMenu(null);
    } catch (e) {
      setError(e.response?.data?.message || 'Action failed');
    }
  };

  const uploadFiles = async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    if (parent) form.append('parent', parent);
    try {
      await api.post('/files/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setNotice(`${files.length} file${files.length > 1 ? 's' : ''} uploaded`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    }
    e.target.value = '';
  };

  const createFolder = async () => {
    const name = window.prompt('Name your new folder');
    if (!name?.trim()) return;
    try {
      await api.post('/files/folder', { name, parent });
      setNotice('Folder created');
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not create folder');
    }
  };

  const download = async (item) => {
    try {
      const r = await api.get(`/files/${item._id}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      a.click();
      URL.revokeObjectURL(url);
      setMenu(null);
    } catch {
      setError('Could not download this file');
    }
  };

  const share = async (item) => {
    try {
      const { data } = await api.post(`/files/${item._id}/share`);
      await navigator.clipboard.writeText(data.url);
      setNotice('Share link copied to clipboard');
      setMenu(null);
    } catch {
      setError('Could not create or copy share link');
    }
  };

  const restoreItem = async (item) => {
    try {
      await api.post(`/files/${item._id}/restore`);
      load();
      setNotice('Item restored');
      setMenu(null);
    } catch {
      setError('Could not restore item');
    }
  };

  const deleteForever = async (item) => {
    if (!window.confirm('Permanently delete this item? This cannot be undone.'))
      return;
    try {
      await api.delete(`/files/${item._id}`);
      load();
      setNotice('Item permanently deleted');
      setMenu(null);
    } catch {
      setError('Could not delete item');
    }
  };

  const title =
    view === 'starred'
      ? 'Starred'
      : view === 'trash'
        ? 'Trash'
        : parent
          ? crumbs.at(-1)?.name || 'Folder'
          : 'My Drive';

  const totalBytes = useMemo(
    () => items.reduce((s, i) => s + (i.size || 0), 0),
    [items]
  );

  return (
    <div className="drive-app">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="side-top">
          <div className="brand-logo small">
            <Cloud />
          </div>
          <span className="brand-name">
            Drive<span>Space</span>
          </span>
          <button
            className="icon-button mobile-close"
            onClick={() => setMobileNav(false)}
          >
            <X />
          </button>
        </div>

        <button
          className="new-button"
          onClick={() => {
            createFolder();
            setMobileNav(false);
          }}
        >
          <Plus size={19} /> New folder
        </button>

        <nav className="side-nav">
          {[
            { id: 'all', label: 'My Drive', icon: HardDrive },
            { id: 'starred', label: 'Starred', icon: Star },
            { id: 'trash', label: 'Trash', icon: Trash2 },
          ].map((n) => (
            <button
              key={n.id}
              className={view === n.id ? 'active' : ''}
              onClick={() => {
                setView(n.id);
                setParent(null);
                setCrumbs([]);
                setQuery('');
                setMobileNav(false);
              }}
            >
              <n.icon size={18} />
              {n.label}
            </button>
          ))}
        </nav>

        <div className="storage-card">
          <div className="storage-heading">
            <span>Storage</span>
            <span>Local</span>
          </div>
          <div className="storage-track">
            <span />
          </div>
          <p>Files are stored on your server.</p>
          <span className="storage-caption">
            {fmtSize(totalBytes)} in this view
          </span>
        </div>

        <div className="sidebar-user">
          <div className="avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div className="user-details">
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
          </div>
          <button className="icon-button" title="Sign out" onClick={logout}>
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      {mobileNav && (
        <div className="nav-scrim" onClick={() => setMobileNav(false)} />
      )}

      <main className="main-area">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setMobileNav(true)}
          >
            <Menu />
          </button>
          <div className="search-box">
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in Drive"
            />
            <kbd>⌘ K</kbd>
          </div>
          <div className="top-actions">
            <button
              className="icon-button"
              title="Upload files"
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={19} />
            </button>
            <div className="avatar top-avatar">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={uploadFiles}
          />
        </header>

        <section className="content-area">
          <div className="welcome-row">
            <div>
              <span className="eyebrow">YOUR WORKSPACE</span>
              <h1>
                {title}
                <span className="title-dot">.</span>
              </h1>
              <div className="breadcrumbs">
                <button onClick={() => goCrumb(-1)}>My Drive</button>
                {crumbs.map((c, i) => (
                  <span key={c._id}>
                    <ChevronRight size={13} />
                    <button onClick={() => goCrumb(i)}>{c.name}</button>
                  </span>
                ))}
              </div>
            </div>
            <div className="welcome-actions">
              <button className="outline-button" onClick={createFolder}>
                <FolderPlus size={16} /> New folder
              </button>
              <button
                className="primary-button"
                onClick={() => inputRef.current?.click()}
              >
                <Upload size={16} /> Upload files
              </button>
            </div>
          </div>

          <div className="toolbar">
            <div>
              <span className="item-count">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
              {query && (
                <span className="filter-tag">
                  Search: {query}{' '}
                  <button onClick={() => setQuery('')}>×</button>
                </span>
              )}
            </div>
            <div className="view-switch">
              <button
                className={layout === 'grid' ? 'selected' : ''}
                onClick={() => setLayout('grid')}
                title="Grid view"
              >
                <Grid2X2 size={17} />
              </button>
              <button
                className={layout === 'list' ? 'selected' : ''}
                onClick={() => setLayout('list')}
                title="List view"
              >
                <List size={18} />
              </button>
            </div>
          </div>

          {error && (
            <div className="error-banner page-error">
              {error}
              <button onClick={() => setError('')}>×</button>
            </div>
          )}

          {busy ? (
            <div className="empty-state">
              <div className="spinner" />
              <p>Finding your files…</p>
            </div>
          ) : items.length ? (
            <div className={layout === 'grid' ? 'file-grid' : 'file-list'}>
              {items.map((item) => {
                const Icon = iconFor(item);
                return (
                  <article
                    className={`file-card ${layout === 'list' ? 'list-card' : ''}`}
                    key={item._id}
                    onDoubleClick={() => item.isFolder && navigate(item)}
                  >
                    <div className="file-card-top">
                      <div
                        className={`file-icon ${item.isFolder ? 'folder-icon' : ''}`}
                      >
                        <Icon size={21} />
                      </div>

                      <div className="file-card-actions">
                        <button
                          className="icon-button star-button"
                          title={item.starred ? 'Unstar' : 'Add to starred'}
                          onClick={() =>
                            action(item._id, { starred: !item.starred })
                          }
                        >
                          <Star
                            size={16}
                            fill={item.starred ? 'currentColor' : 'none'}
                            className={item.starred ? 'starred' : ''}
                          />
                        </button>

                        <button
                          className="icon-button"
                          onClick={() =>
                            setMenu(menu === item._id ? null : item._id)
                          }
                        >
                          <MoreHorizontal size={19} />
                        </button>

                        {menu === item._id && (
                          <div className="context-menu">
                            {!item.isFolder && (
                              <>
                                <button onClick={() => download(item)}>
                                  <Download /> Download
                                </button>
                                <button onClick={() => share(item)}>
                                  <Share2 /> Copy share link
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => {
                                const name = window.prompt(
                                  'Rename item',
                                  item.name
                                );
                                if (name?.trim()) action(item._id, { name });
                              }}
                            >
                              <Pencil /> Rename
                            </button>

                            {view === 'trash' ? (
                              <>
                                <button onClick={() => restoreItem(item)}>
                                  <RotateCcw /> Restore
                                </button>

                                <button
                                  className="danger-action"
                                  onClick={() => deleteForever(item)}
                                >
                                  <Trash2 /> Delete forever
                                </button>
                              </>
                            ) : (
                              <button
                                className="danger-action"
                                onClick={() =>
                                  action(item._id, { trashed: true })
                                }
                              >
                                <Trash2 /> Move to trash
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      className="file-name-button"
                      onClick={() =>
                        item.isFolder ? navigate(item) : download(item)
                      }
                    >
                      {item.name}
                    </button>

                    <div className="file-meta">
                      <span>
                        {item.isFolder ? 'Folder' : fmtSize(item.size)}
                      </span>
                      <span>·</span>
                      <span>{fmtDate(item.updatedAt)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-art">
                <div className="empty-cloud">
                  <Cloud size={36} />
                </div>
                <div className="empty-folder">
                  <Folder size={46} />
                </div>
              </div>
              <h3>
                {query
                  ? 'No matching files'
                  : view === 'trash'
                    ? 'Trash is empty'
                    : view === 'starred'
                      ? 'Nothing starred yet'
                      : 'Your drive is a blank canvas'}
              </h3>
              <p>
                {query
                  ? 'Try a different search term.'
                  : view === 'trash'
                    ? 'Items you move to trash will show up here.'
                    : view === 'starred'
                      ? 'Star files and folders to find them quickly.'
                      : 'Add a folder or upload your first file to get started.'}
              </p>
              {view === 'all' && !query && (
                <div className="empty-actions">
                  <button className="outline-button" onClick={createFolder}>
                    <FolderPlus size={16} /> Create a folder
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => inputRef.current?.click()}
                  >
                    <Upload size={16} /> Upload a file
                  </button>
                </div>
              )}
            </div>
          )}

          <footer className="content-footer">
            <span>
              <span className="status-dot" /> All changes saved
            </span>
            <span>DRIVESPACE · YOUR PERSONAL CLOUD</span>
          </footer>
        </section>
      </main>

      {notice && (
        <div className="toast">
          <Check size={16} />
          {notice}
        </div>
      )}
    </div>
  );
}
