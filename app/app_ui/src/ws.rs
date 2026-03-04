use crate::{server::AppState, websocket};
use axum::{
    extract::{
        ws::{WebSocket, WebSocketUpgrade},
        ConnectInfo, State,
    },
    response::IntoResponse,
};
use std::net::SocketAddr;
use std::sync::Arc;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE GATEKEEPER                              //
//                          (Upgrade & Auth Handover)                         //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// The entry point for the WebSocket upgrade.
/// Following the Gatekeeper pattern: we handle metadata and connection logic here
/// before delegating the "Brain" work to websocket.rs.
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    State(_state): State<Arc<AppState>>,
) -> impl IntoResponse {
    tracing::info!("WS connection attempt from {}", addr);

    // Delegate the actual socket handling to the websocket module (The Brain)
    ws.on_upgrade(move |socket| handle_connection(socket, addr))
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                                2. THE BRAIN                                //
//                             (Connection Handler)                           //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

async fn handle_connection(socket: WebSocket, addr: SocketAddr) {
    tracing::debug!("WebSocket session established: {}", addr);

    // Pass to the core business logic
    websocket::handle_socket(socket).await;

    tracing::debug!("WebSocket session closed: {}", addr);
}
