use app_core::types::ApiResponse;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               1. THE BRAIN                                 //
//                             (API Handlers)                                 //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// Creates a new source using the CreateSourceRequest DTO.
/// Bridges the flat JS shape to the core Source model.
pub async fn handle_create_source(
    Json(req): Json<app_core::types::CreateSourceRequest>,
) -> impl IntoResponse {
    use std::convert::TryInto;
    let _source: app_core::types::system::source::Source = match req.try_into() {
        Ok(s) => s,
        Err(e) => {
            return (StatusCode::BAD_REQUEST, Json(ApiResponse::<()>::error(e))).into_response()
        }
    };

    Json(ApiResponse::<()>::success("Source created (Stub)", None)).into_response()
}

/// Deletes a source by ID.
pub async fn handle_delete_source() -> impl IntoResponse {
    Json(ApiResponse::<()>::success("Source deleted (Stub)", None)).into_response()
}

/// Lists all sources. Returns the standard core Source shape.
pub async fn handle_get_sources() -> impl IntoResponse {
    use app_core::types::system::source::{Author, Source, SourceTitle};

    let sources = vec![
        Source {
            author: Author::Name("Flavius Josephus".into()),
            title: SourceTitle {
                text: "The Antiquities of the Jews".into(),
                identity: None,
            },
        },
        Source {
            author: Author::Name("E.P. Sanders".into()),
            title: SourceTitle {
                text: "The Historical Figure of Jesus".into(),
                identity: None,
            },
        },
    ];

    Json(ApiResponse::success("Sources retrieved", Some(sources)))
}
