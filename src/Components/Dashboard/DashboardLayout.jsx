import React from 'react';
import SideBar from './SideBar';
import TopBar from './TopBar';

const DashboardLayout = ({ currentUser, onLogout, children }) => {
    return (
        <div style={{ display: 'flex' }}>
            <SideBar currentUser={currentUser} onLogout={onLogout} />
            <div style={{ flex: 1 }}>
                <TopBar currentUser={currentUser} />
                <div style={{ padding: '20px' }}>{children}</div>
            </div>
        </div>
    );
};

export default DashboardLayout;
