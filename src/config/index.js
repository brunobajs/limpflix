// Configurações centralizadas da aplicação
export const config = {
    // API e Serviços
    supabase: {
        maxRetries: 3,
        timeout: 30000,
        schema: 'public'
    },
    
    mercadoPago: {
        installments: 12,
        excludedPaymentTypes: ['ticket'],
        statementDescriptor: 'LimpFlix Serviços'
    },

    // Limites e Timeouts
    uploads: {
        maxSizeMB: 5,
        allowedTypes: ['image/jpeg', 'image/png'],
        compressionQuality: 0.7
    },

    // Cache
    cacheTimeout: {
        providers: 5 * 60 * 1000, // 5 minutos
        services: 15 * 60 * 1000  // 15 minutos
    },

    // Paginação
    pageSize: {
        providers: 20,
        services: 50,
        transactions: 25
    }
}

// Validações
export const validation = {
    password: {
        minLength: 6,
        requireSpecialChar: true
    },
    pix: {
        maxLength: 100
    },
    bio: {
        maxLength: 500
    }
}

// Constantes
export const constants = {
    serviceOptions: [
        'Limpeza de Sofá',
        'Limpeza de Colchão',
        'Limpeza de Carpete',
        'Limpeza de Cortinas',
        'Limpeza de Pisos',
        "Limpeza de Caixa d'Água",
        'Limpeza de Vidros',
        'Limpeza de Fachada',
        'Limpeza Pós-Obra',
        'Impermeabilização',
        'Faxina Residencial'
    ],
    states: [
        'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
        'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 
        'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
    ]
}
