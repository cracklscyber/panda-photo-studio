'use client'

import { useState, useEffect } from 'react'
import Chat from '@/components/Chat'
import Lumino from '@/components/Lumino'
import AuthModal from '@/components/AuthModal'
import { getGalleryImages, toggleArchiveImage, GalleryImage as DBGalleryImage } from '@/lib/database'
import { getCurrentUser, onAuthStateChange, signOut } from '@/lib/auth'
import { User } from '@supabase/supabase-js'

interface GalleryImage {
  id: string
  image: string
  createdAt: string
  archived?: boolean
}

export default function Home() {
  const [showChat, setShowChat] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])
  const [editImage, setEditImage] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([])
  const [showCompareView, setShowCompareView] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)

  // Listen to auth state changes
  useEffect(() => {
    getCurrentUser().then(setUser)
    const { data: { subscription } } = onAuthStateChange(setUser)
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await signOut()
    setUser(null)
  }

  const openChatWithImage = (image: string) => {
    setEditImage(image)
    setShowGallery(false)
    setShowChat(true)
  }

  const toggleArchive = async (id: string) => {
    const img = galleryImages.find(i => i.id === id)
    if (img) {
      const newArchived = !img.archived
      await toggleArchiveImage(id, newArchived)
      setGalleryImages(galleryImages.map(i =>
        i.id === id ? { ...i, archived: newArchived } : i
      ))
    }
  }

  const toggleSelectForCompare = (image: string) => {
    if (selectedForCompare.includes(image)) {
      setSelectedForCompare(selectedForCompare.filter(img => img !== image))
    } else if (selectedForCompare.length < 4) {
      setSelectedForCompare([...selectedForCompare, image])
    }
  }

  const startCompare = () => {
    if (selectedForCompare.length >= 2) {
      setShowCompareView(true)
    }
  }

  const exitCompareMode = () => {
    setCompareMode(false)
    setSelectedForCompare([])
    setShowCompareView(false)
  }

  // Load gallery images from Supabase
  useEffect(() => {
    const loadImages = async () => {
      const images = await getGalleryImages(user?.id)
      // Map from DB format to local format
      setGalleryImages(images.map(img => ({
        id: img.id,
        image: img.image_url,
        createdAt: img.created_at,
        archived: img.archived
      })))
    }
    loadImages()
  }, [showGallery, user])

  // Filter images based on archive status
  const visibleImages = galleryImages.filter(img => showArchived ? img.archived : !img.archived)
  const archivedCount = galleryImages.filter(img => img.archived).length

  // Compare View
  if (showCompareView) {
    return (
      <main className="min-h-screen flex flex-col items-center p-4 relative z-10 page-enter">
        <div className="w-full max-w-6xl">
          {/* Header */}
          <div className="text-center mb-6">
            <button
              onClick={exitCompareMode}
              className="text-gray-400 hover:text-white transition-colors mb-4 flex items-center gap-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Zurück zur Galerie
            </button>
            <h1 className="text-2xl font-bold gradient-text">Bilder vergleichen</h1>
            <p className="text-gray-400 mt-2">{selectedForCompare.length} Bilder ausgewählt</p>
          </div>

          {/* Compare Grid */}
          <div className={`grid gap-4 ${
            selectedForCompare.length === 2 ? 'grid-cols-2' :
            selectedForCompare.length === 3 ? 'grid-cols-3' :
            'grid-cols-2 md:grid-cols-4'
          }`}>
            {selectedForCompare.map((image, index) => (
              <div key={index} className="glass-card rounded-xl overflow-hidden">
                <img
                  src={image}
                  alt={`Vergleich ${index + 1}`}
                  className="w-full aspect-square object-cover"
                />
                <div className="p-3 flex justify-between items-center">
                  <span className="text-sm text-gray-400">Bild {index + 1}</span>
                  <a
                    href={image}
                    download={`lumino-vergleich-${index + 1}.png`}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                    title="Herunterladen"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    )
  }

  // Gallery View
  if (showGallery) {
    return (
      <main className="min-h-screen flex flex-col items-center p-4 relative z-10 page-enter">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-6">
            <button
              onClick={() => { setShowGallery(false); setCompareMode(false); setSelectedForCompare([]); }}
              className="text-gray-400 hover:text-white transition-colors mb-4 flex items-center gap-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Zurück
            </button>
            <h1 className="text-2xl font-bold gradient-text">
              {compareMode ? 'Bilder vergleichen' : showArchived ? 'Archiv' : 'Meine Galerie'}
            </h1>
            <p className="text-gray-400 mt-2">
              {showArchived
                ? `${archivedCount} archivierte Bilder`
                : `${visibleImages.length} generierte Bilder`
              }
            </p>

            {/* Archive Toggle & Compare */}
            <div className="flex justify-center gap-2 mt-4 flex-wrap">
              <button
                onClick={() => { setShowArchived(false); setCompareMode(false); setSelectedForCompare([]); }}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  !showArchived && !compareMode
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                Galerie
              </button>
              <button
                onClick={() => { setShowArchived(true); setCompareMode(false); setSelectedForCompare([]); }}
                className={`px-4 py-2 rounded-full text-sm transition-colors flex items-center gap-2 ${
                  showArchived
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Archiv {archivedCount > 0 && `(${archivedCount})`}
              </button>
              <button
                onClick={() => { setCompareMode(!compareMode); setSelectedForCompare([]); setShowArchived(false); }}
                className={`px-4 py-2 rounded-full text-sm transition-colors flex items-center gap-2 ${
                  compareMode
                    ? 'bg-cyan-600 text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                Vergleichen
              </button>
            </div>

            {/* Compare Mode Info */}
            {compareMode && (
              <div className="mt-4 p-4 glass-card rounded-xl">
                <p className="text-gray-300 text-sm">
                  Wähle 2-4 Bilder zum Vergleichen aus ({selectedForCompare.length}/4 ausgewählt)
                </p>
                {selectedForCompare.length >= 2 && (
                  <button
                    onClick={startCompare}
                    className="gradient-button text-white font-semibold py-2 px-6 rounded-full mt-3 text-sm"
                  >
                    Jetzt vergleichen
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Gallery Grid */}
          {visibleImages.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center">
              <p className="text-gray-400">
                {showArchived ? 'Keine archivierten Bilder.' : 'Noch keine Bilder generiert.'}
              </p>
              {!showArchived && (
                <button
                  onClick={() => { setShowGallery(false); setShowChat(true); }}
                  className="gradient-button text-white font-semibold py-3 px-8 rounded-full mt-6"
                >
                  Erstes Bild erstellen
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {visibleImages.map((item) => (
                <div key={item.id} className={`glass-card rounded-xl overflow-hidden group ${
                  compareMode && selectedForCompare.includes(item.image) ? 'ring-2 ring-cyan-500' : ''
                }`}>
                  <div
                    className="relative cursor-pointer"
                    onClick={() => compareMode ? toggleSelectForCompare(item.image) : openChatWithImage(item.image)}
                  >
                    <img
                      src={item.image}
                      alt="Generated"
                      className={`w-full aspect-square object-cover transition-opacity ${
                        compareMode && selectedForCompare.includes(item.image) ? 'opacity-80' : 'group-hover:opacity-80'
                      }`}
                    />
                    {compareMode ? (
                      <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                        selectedForCompare.includes(item.image) ? 'opacity-100 bg-cyan-500/30' : 'opacity-0 group-hover:opacity-100 bg-black/40'
                      }`}>
                        <div className={`rounded-full p-3 ${
                          selectedForCompare.includes(item.image) ? 'bg-cyan-500' : 'bg-white/20 backdrop-blur-sm'
                        }`}>
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {selectedForCompare.includes(item.image) ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            )}
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString('de-DE')}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openChatWithImage(item.image)}
                        className="text-purple-400 hover:text-purple-300 transition-colors"
                        title="Bearbeiten"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => toggleArchive(item.id)}
                        className="text-yellow-400 hover:text-yellow-300 transition-colors"
                        title={item.archived ? "Wiederherstellen" : "Archivieren"}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {item.archived ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          )}
                        </svg>
                      </button>
                      <a
                        href={item.image}
                        download={`lumino-${item.id}.png`}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors"
                        title="Herunterladen"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    )
  }

  // Chat View
  if (showChat) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10 page-enter">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <button
              onClick={() => { setShowChat(false); setEditImage(null); }}
              className="text-gray-400 hover:text-white transition-colors mb-4 flex items-center gap-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Zurück
            </button>
            <div className="flex items-center justify-center gap-3">
              <Lumino size="small" />
              <h1 className="text-2xl font-bold gradient-text">Lumino Studio</h1>
            </div>
          </div>

          {/* Chat Interface */}
          <Chat initialImage={editImage} onClearInitialImage={() => setEditImage(null)} userId={user?.id} />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}

      {/* User Status Bar */}
      <div className="fixed top-4 right-4 z-40">
        {user ? (
          <div className="flex items-center gap-3 glass-card rounded-full px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-300 truncate max-w-32">{user.email}</span>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="glass-card rounded-full px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Login
          </button>
        )}
      </div>

      <div className="glass-card rounded-3xl p-10 max-w-lg w-full text-center page-enter">
        {/* Mascot */}
        <Lumino size="large" />

        {/* Title */}
        <h1 className="text-4xl font-bold mt-6 gradient-text">
          Lumino Studio
        </h1>

        {/* Subtitle */}
        <p className="text-gray-400 mt-4 text-lg">
          Dein KI-Assistent für professionelle Produktfotos
        </p>

        {/* Features */}
        <div className="flex justify-center gap-6 mt-8 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span>KI-generiert</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
            <span>Professionell</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span>Schnell</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-10 justify-center">
          <button
            onClick={() => setShowChat(true)}
            className="gradient-button text-white font-semibold py-4 px-10 rounded-full text-lg"
          >
            Chat starten
          </button>
          <button
            onClick={() => setShowGallery(true)}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-10 rounded-full text-lg border border-white/20 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Galerie
          </button>
        </div>

        {/* Footer hint */}
        <p className="text-gray-600 text-sm mt-6">
          Lade ein Foto hoch und beschreibe dein Wunschbild
        </p>
      </div>
    </main>
  )
}
