/**
 * Sidebar — Navigation & User Menu
 * =================================
 *
 * Green theme sidebar with role-based navigation.
 * Active/hover states use red (#D50010) accents.
 *
 * Structure:
 *   Logo          (SICAM AGRI)
 *   User Card     (always top-left)
 *   Navigation    (grouped by sections)
 */

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  IconDashboard, IconUsers, IconNursery, IconVariety, IconSemis,
  IconPlanning, IconCycle, IconLot, IconHistory,
  IconSupervision,
  IconWarehouse,
} from './icons';

import UserCard from './UserCard';

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
      transition: 'transform 0.25s ease',
      transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
      opacity: 0.5,
      flexShrink: 0,
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  // ── Track which sections are expanded ──
  const [expandedSections, setExpandedSections] = useState([]);

  // ── Navigation sections ──
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
        { name: 'Production', path: '/activity', roles: ['admin', 'ingenieur', 'employe', 'visiteur'] },
        { name: 'Supervision', path: '/supervision', roles: ['admin', 'ingenieur', 'employe', 'visiteur'] },
        { name: 'Historique', path: '/history', roles: ['admin', 'ingenieur', 'employe', 'visiteur'] },
      ],
    },
  ];

  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          links: section.links.filter((link) => link.roles.includes(user?.role)),
        }))
        .filter((section) => section.links.length > 0),
    [user?.role]
  );

  useEffect(() => {
    const activeSection = visibleSections.find((section) =>
      section.links.some((link) => link.path === location.pathname)
    );
    if (activeSection) {
      setExpandedSections((prev) =>
        prev[0] !== activeSection.label ? [activeSection.label] : prev
      );
    }
  }, [location.pathname]);

  const toggleSection = (label) => {
    setExpandedSections((prev) =>
      prev.includes(label) ? [] : [label]
    );
  };

  const isSectionActive = useCallback((section) => {
    return section.links.some((link) => location.pathname === link.path);
  }, [location.pathname]);

  const isActive = useCallback((path) => {
    if (path.includes('?')) {
      return location.pathname + location.search === path;
    }
    return location.pathname === path;
  }, [location.pathname, location.search]);

  return (
    <aside
      aria-label="Menu de navigation"
      className="sidebar-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '240px',
        backgroundColor: '#E8F5E9',
        color: '#000000',
      }}
    >
      {/* ═══ Logo — bigger, standalone ═══ */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '20px 14px 10px',
        }}
      >
        <a href="/dashboard" aria-label="Accueil SICAM AGRI" style={{ lineHeight: 0 }}>
          <img
            src="/sicam-logo.png"
            alt="SICAM AGRI"
            style={{
              height: '56px',
              width: 'auto',
              display: 'block',
            }}
          />
        </a>
      </div>



      {/* ═══ Navigation ═══ */}
      <nav
        aria-label="Navigation principale"
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          padding: '10px 14px',
        }}
      >
        {/* ═══ Standalone Dashboard link ═══ */}
        <Link
          to="/dashboard"
          aria-current={isActive('/dashboard') ? 'page' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '9px 14px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '13.5px',
            fontWeight: isActive('/dashboard') ? 600 : 500,
            color: isActive('/dashboard')
              ? '#FFFFFF'
              : '#000000',
            backgroundColor: isActive('/dashboard')
              ? '#D50010'
              : 'transparent',
            transition: 'all 0.15s ease',
            marginBottom: '16px',
          }}
          onMouseEnter={(e) => {
            if (!isActive('/dashboard')) {
              e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.08)';
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
          <span style={{ width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconDashboard />
          </span>
          <span>Dashboard</span>
        </Link>

        {visibleSections.map((section, sectionIdx) => {
          const isExpanded = expandedSections.includes(section.label);
          const sectionActive = isSectionActive(section);

          return (
            <div
              key={section.label}
              style={{
                marginBottom:
                  sectionIdx < visibleSections.length - 1 ? '16px' : 0,
              }}
            >
              <button
                onClick={() => toggleSection(section.label)}
                aria-expanded={isExpanded}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '9px 14px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: isExpanded
                    ? 'rgba(0,128,48,0.08)'
                    : sectionActive && !isExpanded
                      ? 'rgba(213,0,16,0.06)'
                      : 'transparent',
                  color: sectionActive && !isExpanded
                    ? '#D50010'
                    : isExpanded
                      ? '#008030'
                      : '#000000',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease',
                  marginBottom: isExpanded ? '6px' : '0',
                }}
                onMouseEnter={(e) => {
                  if (!isExpanded && !sectionActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
                    e.currentTarget.style.color = '#000000';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isExpanded && !sectionActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#000000';
                  } else if (!isExpanded && sectionActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(213,0,16,0.06)';
                    e.currentTarget.style.color = '#D50010';
                  }
                }}
              >
                <span>{section.label}</span>
                <ChevronDown open={isExpanded} />
              </button>

              <div
                style={{
                  overflow: 'hidden',
                  maxHeight: isExpanded ? '500px' : '0',
                  opacity: isExpanded ? 1 : 0,
                  transition: 'max-height 0.3s ease, opacity 0.2s ease',
                }}
              >
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  {section.links.map((link) => {
                    const linkActive = isActive(link.path);
                    return (
                      <li key={link.path}>
                        <Link
                          to={link.path}
                          aria-current={linkActive ? 'page' : undefined}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '9px 14px 9px 24px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontSize: '13.5px',
                            fontWeight: linkActive ? 600 : 500,
                            color: linkActive
                              ? '#FFFFFF'
                              : '#000000',
                            backgroundColor: linkActive
                              ? '#D50010'
                              : 'transparent',
                            transition: 'all 0.15s ease',
                            position: 'relative',
                          }}
                          onMouseEnter={(e) => {
                            if (!linkActive) {
                              e.currentTarget.style.backgroundColor =
                                'rgba(0,0,0,0.08)';
                              e.currentTarget.style.color =
                                '#000000';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!linkActive) {
                              e.currentTarget.style.backgroundColor =
                                'transparent';
                              e.currentTarget.style.color =
                                '#000000';
                            }
                          }}
                        >
                          <span
                            style={{
                              width: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {(() => {
                              switch(link.name) {
                                case 'Dashboard': return <IconDashboard />;
                                case 'Utilisateurs': return <IconUsers />;
                                case 'Pépinières': return <IconNursery />;
                                case 'Variétés': return <IconVariety />;
                                case 'Fournisseurs': return <IconVariety />;
                                case 'Semis': return <IconSemis />;
                                case 'Supervision': return <IconSupervision />;
                                case 'Planification Production': return <IconPlanning />;
                                case 'Cycles de Semis': return <IconCycle />;
                                case 'Test Germination': return <IconLot />;
                                case 'Lots Production': return <IconPlanning />;
                                case 'Historique': return <IconHistory />;
                                case 'Magazin':
                                case 'Stock':
                                case 'Stock de Semences': return <IconWarehouse />;
                                case 'Test de germination':
                                case 'Tests de germination': return <IconLot />;
                                default: return null;
                              }
                            })()}
                          </span>
                          <span>{link.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </nav>

      {/* ═══ User Card at bottom ═══ */}
      <div style={{
        padding: '12px 14px',
        borderTop: '1px solid rgba(0,128,48,0.1)',
        flexShrink: 0,
      }}>
        <UserCard />
      </div>

    </aside>
  );
};

export default Sidebar;
