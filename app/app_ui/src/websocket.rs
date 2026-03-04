use axum::extract::ws::{Message, WebSocket};
use futures::{sink::SinkExt, stream::StreamExt};
use tokio::sync::mpsc;

/// Handles the actual lifecycle of the WebSocket connection (The Brain).
pub async fn handle_socket(socket: WebSocket) {
    // Split the socket into a sender and receiver
    let (mut sender, mut receiver) = socket.split();

    // Create a channel for internal communication
    // This allows different parts of the system to push messages TO this specific client
    let (tx, mut rx) = mpsc::channel::<Message>(100);

    // [STRUCTURAL FIX] In a real app, you would register 'tx' in AppState's SessionRegistry here
    // so that other parts of the codebase can find this specific user and .send() to them.
    // For now, we'll keep it as a local demonstration.
    let tx_clone = tx.clone();

    // Task 1: Forward messages from our internal channel to the actual WebSocket
    let mut send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sender.send(msg).await.is_err() {
                break; // Connection closed
            }
        }
    });

    // Task 2: Handle incoming messages from the client
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    println!("Received message: {}", text);

                    // Example of using the 'tx' sender: Echoing the message back
                    let response = format!("AI Echo: {}", text);
                    let _ = tx_clone.send(Message::Text(response)).await;
                }
                Message::Close(_) => break,
                _ => (),
            }
        }
    });

    // If either task finishes (error or close), abort the other
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };
}
