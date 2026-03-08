use crate::{chroma::ChromaStorage, sqlite::SqliteStorage};
use std::sync::Arc;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[derive(Clone)]
pub struct StorageManager {
    pub sqlite: SqliteStorage,
    pub chroma: Arc<ChromaStorage>,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl StorageManager {
    pub fn new(sqlite: SqliteStorage, chroma: Arc<ChromaStorage>) -> Self {
        Self { sqlite, chroma }
    }
}
