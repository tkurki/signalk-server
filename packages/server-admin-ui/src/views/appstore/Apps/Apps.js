import React, { useState, useCallback, useRef, useEffect } from 'react'
import { connect } from 'react-redux'
import { Badge, Button, Input } from 'reactstrap'
import { AgGridReact } from 'ag-grid-react' // React Grid Logic
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'

/* Javascript files */
import columnDefs from '../Grid/columnDefs'

/* Components */
import WarningBox from './WarningBox'

/* Styling */
import '../appStore.scss'
import 'ag-grid-community/styles/ag-grid.css' // Core CSS
import 'ag-grid-community/styles/ag-theme-quartz.css' // Theme

/** Main component */
const Apps = function (props) {
  /** State */
  const [selectedView, setSelectedView] = useState('All')
  const [selectedTag, setSelectedTag] = useState('All')

  /* Effects / Watchers */
  useEffect(() => {
    const handleResize = () => {
      // Perform actions on window resize
      toggleColumnsOnMobile(window.innerWidth < 786)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    if (selectedView === 'All') {
      refreshGridData(selectedTag, allAppList())
    } else if (selectedView === 'Installed')
      refreshGridData(
        selectedTag,
        allAppList().filter((el) => el.installed)
      )
    return () => {}
  }, [
    selectedTag,
    selectedView,
    props.appStore.installed,
    props.appStore.available,
  ])

  /**
   * Computed properties returning the whole app list,
   * including plugins and webapp applications
   *
   * @returns {Array} allAppList - the whole app list of available app and installed apps
   */
  const allAppList = () => {
    const installedApp = props.appStore.installed.map((app) => {
      return {
        ...app,
        installed: true,
        updateAvailable:
          app.installedVersion !== app.version ? app.version : null,
      }
    })
    const availableApp = props.appStore.available.map((app) => ({
      ...app,
      installed: false,
    }))

    return [...installedApp, ...availableApp]
  }

  /** Grid Element */

  const gridRef = useRef()
  const [colDefs, setColDefs] = useState([...columnDefs])
  const [rowData, setRowData] = useState(() => allAppList())

  const autoSizeStrategy = {
    type: 'fitGridWidth',
    defaultMinWidth: 100,
    columnLimits: [],
  }

  /** Methods */
  const onSearchTextBoxChanged = useCallback(() => {
    gridRef.current.api.setGridOption(
      'quickFilterText',
      document.getElementById('search-text-box').value
    )
  }, [])

  /**
   * Set the rowData with the filter selected
   */
  const refreshGridData = useCallback((item, gridData) => {
    if (!item || item === 'All') return setRowData(gridData)
    let newData = []
    newData = gridData.filter((el) => el.categories.includes(item))
    setRowData(newData)
  })

  /** Hide columns if widown is small than a threshold */
  const toggleColumnsOnMobile = (hide) => {
    gridRef.current.api.applyColumnState({
      state: [
        { colId: 'description', hide },
        { colId: 'author', hide },
        { colId: 'type', hide },
      ],
    })
  }

  /** Callback called when the grid is ready */
  const onGridReady = () => {
    toggleColumnsOnMobile(window.innerWidth < 786)
  }

  /* Show different warning message
  whether if the store is available or if an app was installed or removed
  */
  let warningHeader

  if (!props.appStore.storeAvailable) {
    warningHeader = (
      <WarningBox>
        You probably don't have Internet connectivity and Appstore can not be
        reached.
      </WarningBox>
    )
  } else if (props.appStore.installing.length > 0) {
    warningHeader = (
      <WarningBox>
        Please restart the server after installing or updating a plugin.
      </WarningBox>
    )
  }

  return (
    <div className="appstore animated fadeIn">
      <section className="appstore__warning section">
        {/* TODO: Display warning message saying if the appstore is not available */}

        {warningHeader}
      </section>

      <header className="appstore__header">
        <div className="title__container">
          <h3 className="title">Apps & Plugins</h3>
          <Button
            color={selectedView === 'All' ? 'primary' : 'secondary'}
            onClick={() => setSelectedView('All')}
          >
            All
          </Button>
          <Button
            color={selectedView === 'Installed' ? 'primary' : 'secondary'}
            onClick={() => setSelectedView('Installed')}
          >
            Installed
          </Button>
          {props.appStore.updates.length > 0 && (
            <Badge color="success" className="badge__update">
              {props.appStore.updates.length}
            </Badge>
          )}
        </div>
        <div className="search">
          <FontAwesomeIcon className="search__icon" icon={faMagnifyingGlass} />
          <Input
            id="search-text-box"
            className="search__input"
            placeholder="Search by plugin or App name..."
            onInput={onSearchTextBoxChanged}
          />
        </div>
      </header>

      <section className="appstore__tags section">
        {props.appStore.categories?.map((item) => (
          <Button
            key={item}
            className={selectedTag === item ? 'active' : undefined}
            outline
            onClick={() => setSelectedTag(item)}
          >
            {item}
          </Button>
        ))}
      </section>

      <section className="appstore__grid section">
        <div className="ag-theme-quartz" style={{ height: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={colDefs}
            rowHeight={80}
            autoSizeStrategy={autoSizeStrategy}
            onGridReady={onGridReady}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </section>
    </div>
  )
}

const mapStateToProps = ({ appStore }) => ({ appStore })
export default connect(mapStateToProps)(Apps)
