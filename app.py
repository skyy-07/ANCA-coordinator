import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import folium
from streamlit_folium import st_folium
import time

# --- Page Configuration ---
st.set_page_config(
    page_title="ANCA Coordinator",
    page_icon="🌍",
    layout="wide",
    initial_sidebar_state="expanded",
)

# --- Styling & Session State ---
if 'simulation_running' not in st.session_state:
    st.session_state.simulation_running = False

if 'atkinson_score' not in st.session_state:
    st.session_state.atkinson_score = 0.45  # Initial dummy value

# Custom CSS
st.markdown("""
    <style>
        .block-container {
            padding-top: 1rem;
            padding-bottom: 1rem;
        }
        .stMetric {
            background-color: #f0f2f6;
            padding: 10px;
            border-radius: 5px;
        }
    </style>
""", unsafe_allow_html=True)

# --- Helper Functions ---
def generate_mock_agent_data():
    agents = ['LeadDeveloper', 'LogisticsAnalyst', 'EthicsAuditor', 'CoordinatorAgent']
    status = np.random.choice(['Active', 'Idle', 'Planning', 'Moving'], size=len(agents))
    battery = np.random.randint(20, 100, size=len(agents))
    tasks = np.random.randint(0, 5, size=len(agents))
    return pd.DataFrame({
        'Agent Im': agents,
        'Status': status,
        'Battery (%)': battery,
        'Active Tasks': tasks
    })

def calculate_atkinson_index(distribution, epsilon=0.5):
    # Mock calculation for display purpose
    return 0.4 + (np.random.random() * 0.1)

# --- Sidebar ---
with st.sidebar:
    st.title("🕹️ Control Panel")
    st.markdown("---")
    
    st.subheader("Simulation Settings")
    sim_mode = st.selectbox("Mode", ["Offline Training", "Live Deployment", "Replay"])
    num_agents = st.slider("Number of Agents", 1, 20, 4)
    speed = st.select_slider("Simulation Speed", options=["1x", "2x", "5x", "10x"])
    
    st.markdown("---")
    
    col1, col2 = st.columns(2)
    with col1:
        start_btn = st.button("▶️ Start", use_container_width=True)
    with col2:
        stop_btn = st.button("⏹️ Stop", use_container_width=True)
        
    if start_btn:
        st.session_state.simulation_running = True
    if stop_btn:
        st.session_state.simulation_running = False
        
    st.markdown("### System Status")
    st.info(f"Status: {'RUNNING' if st.session_state.simulation_running else 'PAUSED'}")

# --- Main Dashboard ---
st.title("🌍 ANCA Coordinator Dashboard")
st.markdown("Decentralized Multi-Agent System for Humanitarian Aid Coordination")

# Tabs
tab1, tab2, tab3 = st.tabs(["🚀 Operations Center", "📊 Analytics & Ethics", "🗺️ Geospatial View"])

with tab1:
    # Key Metrics Row
    c1, c2, c3, c4 = st.columns(4)
    
    # Mock live metrics updates
    latest_atkinson = st.session_state.atkinson_score
    if st.session_state.simulation_running:
        latest_atkinson = calculate_atkinson_index([])
        st.session_state.atkinson_score = latest_atkinson
        
    c1.metric("Active Agents", f"{num_agents}", "2 online")
    c2.metric("Atkinson Inequality Index", f"{latest_atkinson:.3f}", "-0.012", help="Lower is better (0 = perfect equality)")
    c3.metric("Resource Coverage", "78%", "+2.4%")
    c4.metric("Pending SOS", "12", "-3")

    st.markdown("### 🤖 Agent Fleet Status")
    agent_df = generate_mock_agent_data()
    st.dataframe(
        agent_df,
        column_config={
            "Battery (%)": st.column_config.ProgressColumn(
                "Battery",
                help="Current battery level",
                format="%d%%",
                min_value=0,
                max_value=100,
            ),
            "Status": st.column_config.TextColumn("Current Status"),
        },
        use_container_width=True,
        hide_index=True
    )

    col_log, col_events = st.columns([2, 1])
    with col_log:
        st.subheader("System Logs")
        st.code("""
        [10:42:15] INFO: LogisticsAnalyst rerouted to Sector 4
        [10:42:18] INFO: EthicsAuditor verified distribution fairness
        [10:42:22] WARN: LeadDeveloper connection latency high
        [10:42:30] SOS: New request received from Kolkata North
        """, language="bash")
        
    with col_events:
        st.subheader("Event Feed")
        events = pd.DataFrame({
            "Time": ["10:40", "10:35", "10:30"],
            "Event": ["Supply Drop", "Route Blocked", "Agent Deployed"]
        })
        st.table(events)

with tab2:
    st.header("Fairness & Optimization Analytics")
    
    # Mock historical data for charts
    chart_data = pd.DataFrame(
        np.random.randn(20, 3),
        columns=['Utility', 'Fairness', 'Cost']
    )
    
    fig = px.line(chart_data, title="Optimization Objectives Over Time")
    st.plotly_chart(fig, use_container_width=True)
    
    c1, c2 = st.columns(2)
    with c1:
        st.markdown("#### Resource Distribution Heatmap")
        # Placeholder for complex chart
        df_fake = pd.DataFrame(np.random.randint(0,100,size=(10, 10)))
        fig_heat = px.imshow(df_fake, color_continuous_scale='Viridis')
        st.plotly_chart(fig_heat, use_container_width=True)
        
    with c2:
        st.markdown("#### Agent Efficiency")
        fig_bar = px.bar(agent_df, x='Agent Im', y='Active Tasks', color='Status')
        st.plotly_chart(fig_bar, use_container_width=True)

with tab3:
    st.header("📍 West Bengal Operational Map")
    
    # Default to Kolkata coordinates for the map
    m = folium.Map(location=[22.5726, 88.3639], zoom_start=11)
    
    # Add some mock markers
    folium.Marker(
        [22.5726, 88.3639], 
        popup="HQ", 
        icon=folium.Icon(color="red", icon="home")
    ).add_to(m)
    
    folium.Marker(
        [22.58, 88.40], 
        popup="Resource Hub A", 
        icon=folium.Icon(color="blue", icon="info-sign")
    ).add_to(m)
    
    # Render map
    st_data = st_folium(m, width=800, height=500)
    
    st.caption("Map data © OpenStreetMap contributors")

# Footer
st.markdown("---")
st.markdown("© 2026 ANCA System | Powered by Gemini & Ray")
