/**
 * TopNavbar — Horizontal Navigation Bar (alternative to Sidebar)
 * ==============================================================
 *
 * Shows only big section titles (Général, Administration, etc.).
 * Clicking a section opens a dropdown menu with the small link titles.
 *
 * Structure:
 *   Logo | Separator | Section buttons (with dropdowns)
 */

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  IconDashboard, IconUsers, IconNursery, IconVariety, IconSemis,
  IconPlanning, IconCycle, IconLot, IconProduction as IconProd,
  IconHistory, IconSupervision,
  IconWarehouse,
} from './icons';
import UserCard from './UserCard';


/* ── Simple arrow icon for the dropdown indicator ── */
const ChevronDown = ({ open }) => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transition: 'transform 0.2s ease',
      transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
      opacity: 0.5,
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);


const TopNavbar = () => {
  const { user } = useAuth();
  const location = useLocation();

  // ── Track which section dropdown is open ──
  const [openSection, setOpenSection] = useState(null);
  const dropdownRef = useRef(null);
  const openSectionRef = useRef(openSection);
  openSectionRef.current = openSection;

  // ── Close dropdown on outside click ──
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenSection(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Close sub-bar on scroll ──
  useEffect(() => {
    const handleScroll = () => {
      if (openSectionRef.current) setOpenSection(null);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Close dropdowns on route change ──
  useEffect(() => {
    setOpenSection(null);
  }, [location.pathname]);

  const sections = [
    {
      label: 'Administration',
      links: [
        { name: 'Utilisateurs', path: '/users', roles: ['admin'] },
      ],
    },
    {
      label: 'Magazin',
      links: [
        { name: 'Magazin', path: '/stock', roles: ['admin', 'employe', 'ingenieur', 'visiteur'] },
        { name: 'Tests de germination', path: '/tests-germination', roles: ['admin', 'employe', 'ingenieur', 'visiteur'] },
      ],
    },
    {
      label: 'Référentiel',
      links: [
        { name: 'Fournisseurs', path: '/fournisseurs', roles: ['admin', 'ingenieur', 'employe', 'visiteur'] },
        { name: 'Cycles de Semis', path: '/cycles-de-semis', roles: ['admin', 'ingenieur', 'employe', 'visiteur'] },
        { name: 'Pépinières', path: '/pepinieres', roles: ['admin', 'ingenieur', 'employe', 'visiteur'] },
        { name: 'Variétés', path: '/varietes', roles: ['admin', 'ingenieur', 'employe', 'visiteur'] },
      ],
    },
    {
      label: 'Production',
      links: [
        { name: 'Semis', path: '/semis', roles: ['admin', 'ingenieur', 'employe', 'visiteur'] },
        { name: 'Lots Production', path: '/lots/production', roles: ['admin', 'ingenieur', 'employe', 'visiteur'] },
        { name: 'Planification Production', path: '/planning', roles: ['admin', 'ingenieur', 'employe', 'visiteur'] },
        { name: 'Production', path: '/activity', roles: ['admin', 'ingenieur', 'employe', 'visiteur'] },
        { name: 'Supervision', path: '/supervision', roles: ['admin', 'ingenieur', 'employe', 'visiteur'] },
        { name: 'Historique', path: '/history', roles: ['admin', 'ingenieur', 'employe', 'visiteur'] },
      ],
    },
  ];

  // Filter sections by role
  const visibleSections = sections
    .map((section) => ({
      ...section,
      links: section.links.filter((link) => link.roles.includes(user?.role)),
    }))
    .filter((section) => section.links.length > 0);

  // Check if a specific link path matches the current route
  const isActive = useCallback((path) => {
    if (path.includes('?')) return location.pathname + location.search === path;
    return location.pathname === path;
  }, [location.pathname, location.search]);

  // Check if any link in a section is the current active page
  const isSectionActive = useCallback((section) => {
    return section.links.some((link) => isActive(link.path));
  }, [isActive]);

  const toggleSection = (label) => {
    setOpenSection((prev) => (prev === label ? null : label));
  };

  const openSectionData = openSection
    ? visibleSections.find((s) => s.label === openSection)
    : null;

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexShrink: 0,
      }}
    >
      <header
        aria-label="Barre de navigation"
        style={{
          display: 'flex',
          alignItems: 'stretch',
          height: '96px',
          backgroundColor: '#E8F5E9',
          borderBottom: '1px solid rgba(0,128,48,0.15)',
          padding: '0 24px',
          gap: '0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        {/* ═══ Logo ═══ */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          paddingRight: '20px',
          flexShrink: 0,
        }}>
          <a href="/dashboard" aria-label="Accueil SICAM AGRI">
            <img
              src="/sicam-logo.png"
              alt="SICAM AGRI"
              style={{
                height: '60px',
                width: 'auto',
                display: 'block',
              }}
            />
          </a>
        </div>

        {/* ═══ Separator ═══ */}
        <div style={{
          width: '1px',
          height: '50px',
          backgroundColor: 'rgba(0,128,48,0.12)',
          alignSelf: 'center',
          flexShrink: 0,        }} />

        {/* ═══ Navigation — big section titles only ═══ */}
        <nav
          aria-label="Navigation principale"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'stretch',
            gap: '0',
            minWidth: 0,
            padding: '0 4px',
          }}
        >
          {/* Standalone Dashboard link — always visible */}
          <Link
            to="/dashboard"
            aria-current={isActive('/dashboard') ? 'page' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 16px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: isActive('/dashboard') ? 700 : 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: isActive('/dashboard') ? '#FFFFFF' : '#000000',
              backgroundColor: isActive('/dashboard') ? '#D50010' : 'transparent',
              whiteSpace: 'nowrap',
              borderBottom: isActive('/dashboard') ? '2px solid #D50010' : '2px solid transparent',
              transition: 'all 0.15s ease',
              borderRadius: '0',
            }}
            onMouseEnter={(e) => {
              if (!isActive('/dashboard')) {
                e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)';
                e.currentTarget.style.color = '#000000';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive('/dashboard')) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#000000';
              }
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', opacity: isActive('/dashboard') ? 1 : 0.5 }}>
              <IconDashboard />
            </span>
            <span>Dashboard</span>
          </Link>

          {visibleSections.map((section) => {
            const sectionActive = isSectionActive(section);
            const isOpen = openSection === section.label;

            return (
              <button
                key={section.label}
                onClick={() => toggleSection(section.label)}
                aria-expanded={isOpen}
                aria-haspopup="true"
                aria-label={`Menu ${section.label}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 16px',
                  border: 'none',
                  backgroundColor: isOpen
                    ? 'rgba(0,128,48,0.1)'
                    : sectionActive && !isOpen
                      ? 'rgba(213,0,16,0.08)'
                      : 'transparent',
                  color: sectionActive && !isOpen
                    ? '#D50010'
                    : isOpen
                      ? '#008030'
                      : '#000000',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: (isOpen || sectionActive) ? 700 : 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  transition: 'all 0.15s ease',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  borderBottom: isOpen
                    ? '2px solid #008030'
                    : sectionActive && !isOpen
                      ? '2px solid #D50010'
                      : '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isOpen) {
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)';
                    e.currentTarget.style.color = '#000000';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isOpen && !sectionActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#000000';
                  } else if (!isOpen && sectionActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(213,0,16,0.08)';
                    e.currentTarget.style.color = '#D50010';
                  }
                }}
              >
                {section.label}
                <ChevronDown open={isOpen} />
              </button>
            );
          })}
        </nav>

        {/* ═══ User Card ═══ */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '16px',
          flexShrink: 0,
        }}>
          <UserCard />
        </div>

      </header>

      {/* ═══ Full-width horizontal sub-bar ═══ */}
      {openSectionData && (
        <div
          role="menu"
          aria-label={`Sous-menu ${openSectionData.label}`}
          className="sub-bar-scroll"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 28px',
            backgroundColor: '#F5FBF5',
            borderBottom: '1px solid rgba(0,128,48,0.12)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            overflowX: 'auto',
            animation: 'subBarSlideIn 0.15s ease',
          }}
        >
          {/* Section label as badge */}
          <span style={{
            padding: '5px 12px',
            fontSize: '10px',
            fontWeight: 700,
            color: '#008030',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            backgroundColor: 'rgba(0,128,48,0.08)',
            borderRadius: '6px',
            flexShrink: 0,
          }}>
            {openSectionData.label}
          </span>

          {/* Divider */}
          <div style={{
            width: '1px',
            height: '28px',
            backgroundColor: 'rgba(0,128,48,0.15)',
            flexShrink: 0,
          }} />

          {/* Links in horizontal row */}
          {openSectionData.links.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                role="menuitem"
                aria-current={active ? 'page' : undefined}
                onClick={() => setOpenSection(null)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 16px 4px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '13.5px',
                  fontWeight: active ? 600 : 500,
                  color: active ? '#FFFFFF' : '#000000',
                  backgroundColor: active ? '#D50010' : 'transparent',
                  transition: 'all 0.12s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)';
                    e.currentTarget.style.color = '#000000';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#000000';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    opacity: active ? 1 : 0.4,
                    transition: 'opacity 0.12s ease',
                  }}>
                    {(() => {
                      switch(link.name) {
                        case 'Dashboard': return <IconDashboard />;
                        case 'Utilisateurs': return <IconUsers />;
                        case 'Pépinières': return <IconNursery />;
                        case 'Variétés': return <IconVariety />;
                        case 'Fournisseurs': return <IconVariety />;
                        case 'Semis': return <IconSemis />;
                        case 'Planification Production': return <IconPlanning />;
                        case 'Supervision': return <IconSupervision />;
                        case 'Cycles de Semis': return <IconCycle />;
                        case 'Test de germination':
                        case 'Tests de germination': return <IconLot />;
                        case 'Magazin':
                        case 'Stock': return <IconWarehouse />;
                        case 'Stock de Semences': return <IconWarehouse />;
                        case 'Lots Production': return <IconPlanning />;
                        case 'Production': return <IconProd />;
                        case 'Historique': return <IconHistory />;

                        default: return null;
                      }
                    })()}
                  </span>
                  <span>{link.name}</span>
                </div>
                {/* Active indicator underline */}
                <div style={{
                  width: active ? '60%' : '0',
                  height: '2px',
                  borderRadius: '2px',
                  backgroundColor: active ? '#FFFFFF' : 'transparent',
                  transition: 'all 0.2s ease',
                  opacity: active ? 1 : 0,
                }} />
              </Link>
            );
          })}
        </div>
      )}

      {/* ═══ Animation keyframes & scrollbar hover ═══ */}
      <style>{`
        @keyframes subBarSlideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Sub-bar custom scrollbar — visible only on hover */
        .sub-bar-scroll::-webkit-scrollbar {
          height: 4px;
        }
        .sub-bar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sub-bar-scroll::-webkit-scrollbar-thumb {
          background: rgba(0,128,48,0.2);
          border-radius: 4px;
          transition: background 0.2s ease;
        }
        .sub-bar-scroll:hover::-webkit-scrollbar-thumb {
          background: rgba(0,128,48,0.4);
        }
        .sub-bar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(0,128,48,0.6);
        }
        .sub-bar-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(0,128,48,0.2) transparent;
        }
        .sub-bar-scroll:hover {
          scrollbar-color: rgba(0,128,48,0.4) transparent;
        }
      `}</style>
    </div>
  );
};

export default TopNavbar;
