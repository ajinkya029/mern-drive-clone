import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Cloud, Download, File as FileIcon } from 'lucide-react';
import api from '../api';
export default function SharedPage() {
  const { token } = useParams(); const [file, setFile] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api.get(`/files/public/${token}`).then(r => setFile(r.data)).catch(e => setError(e.response?.data?.message || 'This link is unavailable.')); }, [token]);
  return <div className="shared-page"><div className="shared-brand"><Cloud/> DriveSpace</div><div className="shared-card"><div className="shared-icon"><FileIcon/></div>{error ? <><h2>Link unavailable</h2><p>{error}</p></> : file ? <><span className="eyebrow">A FILE WAS SHARED WITH YOU</span><h2>{file.name}</h2><p>{(file.size / 1024 / 1024).toFixed(2)} MB · {file.mimeType}</p><a className="primary-button download-link" href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${file.downloadUrl}`}><Download size={17}/> Download file</a></> : <p>Loading shared file…</p>}</div></div>;
}
